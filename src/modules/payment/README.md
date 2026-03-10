# Module Thanh Toán (Payment)

## Mục lục
- [1. Tổng quan](#1-tổng-quan)
- [2. Luồng thanh toán](#2-luồng-thanh-toán)
- [3. Trạng thái thanh toán](#3-trạng-thái-thanh-toán)
- [4. Giải thích từng API](#4-giải-thích-từng-api)
- [5. Bảo mật](#5-bảo-mật)
- [6. Xử lý lỗi thường gặp](#6-xử-lý-lỗi-thường-gặp)

---

## 1. Tổng quan

Module này xử lý toàn bộ nghiệp vụ thanh toán cho shop:
- Thanh toán qua **PayOS** (chuyển khoản ngân hàng, quét QR)
- Thanh toán **COD** (tiền mặt khi nhận hàng)
- Xác nhận thủ công từ admin
- Đối soát trạng thái với PayOS khi webhook bị miss

### Kiến trúc

```
Client → PaymentController → PaymentService → Prisma (DB)
                                           ↕
                                      PayOS SDK
```

### Khởi tạo PayOS SDK

```typescript
// Clothesshop/src/services/payment/payment.service.ts

constructor(private readonly prisma: PrismaService) {
    this.payos = new PayOS({
        clientId:    process.env.PAYOS_CLIENT_ID    || '',
        apiKey:      process.env.PAYOS_API_KEY       || '',
        checksumKey: process.env.PAYOS_CHECKSUM_KEY  || '',
    });
    this.returnUrl = process.env.PAYOS_RETURN_URL || 'http://localhost:3000/payments/success';
    this.cancelUrl = process.env.PAYOS_CANCEL_URL || 'http://localhost:3000/payments/cancel';
}
```

**Tại sao khởi tạo trong constructor?**
- Khởi tạo 1 lần duy nhất, dùng được trong toàn bộ vòng đời ứng dụng (Singleton)
- Không tạo lại connection mỗi lần có request → tiết kiệm tài nguyên
- Không hardcode key vào code → bảo mật, dễ thay đổi theo môi trường

---

## 2. Luồng thanh toán

### 2.1 Thanh toán qua PayOS (BANK_TRANSFER)

```
1. POST /orders          → Tạo đơn hàng + Payment (PENDING)
2. POST /payments/create-link → Lấy checkoutUrl từ PayOS
3. Redirect user → scan QR / chuyển khoản trên trang PayOS
4. POST /payments/webhook → PayOS callback → server xác nhận → cập nhật DB
5. GET  /payments/check-status/:orderId → Kiểm tra (nếu webhook miss → auto sync)
```

### 2.2 Thanh toán COD

```
1. Tạo đơn hàng với method = COD
2. Shipper giao hàng, thu tiền mặt
3. PATCH /payments/confirm → Admin xác nhận → Payment PAID, Order PROCESSED
```

### 2.3 Hủy thanh toán

```
PATCH /payments/:id/cancel
  → Nếu BANK_TRANSFER: gọi PayOS hủy link (lỗi thì bỏ qua)
  → Payment → FAILED
```

---

## 3. Trạng thái thanh toán

```
PENDING  ──[webhook / confirm]──→  PAID    (terminal)
PENDING  ──[hủy đơn]───────────→  FAILED  (terminal)
```

`PAID` và `FAILED` là trạng thái cuối — không thể hoàn tác. Nếu cần hoàn tiền, tạo bản ghi refund riêng.

---

## 4. Giải thích từng API

### `POST /payments/create-link` — Tạo link thanh toán PayOS

```typescript
// Clothesshop/src/services/payment/payment.service.ts

async createPaymentLink(dto: CreatePaymentLinkDto) {
    const order = await this.prisma.order.findFirst({
        where: { id: dto.orderId },
        include: { payment: true, items: true },
    });

    if (!order)                   throw new NotFoundException('Order not found');
    if (!order.payment)           throw new BadRequestException('Payment record not found for this order');
    if (order.payment.method !== PaymentMethod.BANK_TRANSFER)
                                  throw new BadRequestException('Only BANK_TRANSFER orders can use PayOS');
    if (order.payment.status !== PaymentStatus.PENDING)
                                  throw new BadRequestException('Payment has already been processed');

    // Tính amount từ items, không dùng order.totalPrice
    const amount = order.items.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity, 0
    );

    const paymentLink = await this.payos.paymentRequests.create({
        orderCode:   order.id,
        amount,
        description: `DH${order.id}`,
        returnUrl:   this.returnUrl,
        cancelUrl:   this.cancelUrl,
        items: order.items.map((item) => ({
            name:     item.productName,
            quantity: item.quantity,
            price:    Number(item.price),
        })),
    }) as any;

    const checkoutUrl = paymentLink.checkoutUrl ?? paymentLink.data?.checkoutUrl ?? null;

    // Nếu checkoutUrl rỗng → link đã tồn tại trên PayOS trước đó → fetch lại
    if (!checkoutUrl) {
        const existing = await this.payos.paymentRequests.get(order.id) as any;
        return { ...existing, checkoutUrl: existing.checkoutUrl ?? null, orderId: order.id };
    }

    return { ...paymentLink, checkoutUrl, orderId: order.id };
}
```

**Tại sao tính `amount` từ `items` thay vì `order.totalPrice`?**

PayOS yêu cầu `amount` khớp chính xác với tổng `items[].price × quantity`. Nếu dùng `order.totalPrice` (lưu riêng trong DB) mà có sai lệch làm tròn thì PayOS sẽ từ chối. Tính trực tiếp từ items đảm bảo 2 phía luôn nhất quán.

**Tại sao `include: { payment, items }`?**
- `payment`: Cần kiểm tra `method` và `status` trước khi gọi PayOS
- `items`: Phải gửi danh sách sản phẩm lên PayOS (bắt buộc theo API của PayOS)

**Tại sao fallback khi không có `checkoutUrl`?**

Một số version của PayOS SDK trả về link qua `data.checkoutUrl` thay vì `checkoutUrl` trực tiếp. Nếu vẫn rỗng → link đã được tạo trước đó, ta fetch lại thay vì tạo thêm (tránh duplicate).

---

### `POST /payments/webhook` — Nhận callback từ PayOS

```typescript
// Clothesshop/src/services/payment/payment.service.ts

async handlePayOSWebhook(webhookBody: PayOSWebhookDto) {
    // 1. Xác thực chữ ký HMAC — bước quan trọng nhất
    let webhookData;
    try {
        webhookData = await this.payos.webhooks.verify(webhookBody);
    } catch (error) {
        throw new BadRequestException(`Invalid webhook signature: ${error.message || error}`);
    }

    // 2. Chỉ xử lý khi thanh toán thành công (code = "00")
    if (webhookBody.code !== '00') {
        return { message: 'Webhook received but payment was not successful' };
    }

    const payment = await this.prisma.payment.findFirst({
        where: { orderId: webhookData.orderCode, isDeleted: false },
        include: { order: true },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    // 3. Kiểm tra số tiền khớp với DB
    if (Number(payment.amount) !== webhookData.amount) {
        throw new BadRequestException('Payment amount does not match');
    }

    // 4. Idempotency: PayOS có thể gọi lại nhiều lần do network retry
    if (payment.status === PaymentStatus.PAID) {
        return { message: 'Payment already processed' };
    }

    // 5. Cập nhật payment và order trong 1 transaction
    await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
            where: { id: payment.id },
            data: {
                status:        PaymentStatus.PAID,
                transactionId: webhookData.reference,
                paidAt:        new Date(webhookData.transactionDateTime),
            },
        });
        await tx.order.update({
            where: { id: payment.orderId },
            data:  { status: OrderStatus.PROCESSED },
        });
    });

    return { message: 'Payment processed successfully', orderId: payment.orderId };
}
```

**Tại sao verify chữ ký trước tiên?**

Webhook endpoint là `@Public()` — không cần JWT. Bất kỳ ai cũng có thể gửi request đến đây. Nếu không verify HMAC signature, hacker có thể giả mạo PayOS để xác nhận thanh toán mà không cần trả tiền.

**Tại sao trả về message (không throw) khi `code ≠ "00"`?**

PayOS gọi webhook cho cả các sự kiện thất bại / bị hủy. Trả về 200 OK để PayOS không retry. Throw exception sẽ khiến PayOS hiểu là server lỗi và gọi lại nhiều lần.

**Tại sao kiểm tra `payment.amount`?**

Số tiền trong DB là source of truth. Nếu có sai lệch (do lỗi tính toán hoặc cố ý thay đổi), phải từ chối ngay thay vì xác nhận thanh toán sai số tiền.

**Tại sao dùng `$transaction`?**

Nếu cập nhật `payment` thành công nhưng cập nhật `order` bị lỗi (hoặc ngược lại), dữ liệu sẽ không nhất quán. `$transaction` đảm bảo cả hai cùng thành công hoặc cùng rollback.

---

### `PATCH /payments/confirm` — Xác nhận thủ công (COD / Admin)

```typescript
// Clothesshop/src/services/payment/payment.service.ts

async confirmPayment(dto: ConfirmPaymentDto) {
    const payment = await this.prisma.payment.findFirst({
        where: { id: dto.paymentId, isDeleted: false },
        include: { order: true },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === PaymentStatus.PAID)
        throw new BadRequestException('Payment has already been confirmed');

    await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
            where: { id: payment.id },
            data: {
                status:        PaymentStatus.PAID,
                transactionId: dto.transactionId,
                paidAt:        new Date(),
            },
        });

        // Chỉ cập nhật order nếu vẫn đang PENDING
        if (payment.order.status === OrderStatus.PENDING) {
            await tx.order.update({
                where: { id: payment.orderId },
                data:  { status: OrderStatus.PROCESSED },
            });
        }
    });

    return this.prisma.payment.findUnique({
        where: { id: payment.id },
        include: { order: true },
    });
}
```

**Tại sao kiểm tra `order.status === PENDING` trước khi cập nhật order?**

Order có thể đã được admin chuyển sang `PROCESSED` hoặc `SHIPPED` theo cách khác trước đó. Không nên tự ý lùi trạng thái của order về; chỉ cập nhật khi order thực sự vẫn còn `PENDING`.

---

### `PATCH /payments/:id/cancel` — Hủy thanh toán

```typescript
// Clothesshop/src/services/payment/payment.service.ts

async cancelPayment(paymentId: number) {
    const payment = await this.prisma.payment.findFirst({
        where: { id: paymentId, isDeleted: false },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === PaymentStatus.PAID)
        throw new BadRequestException('Cannot cancel a paid payment');

    // Hủy link trên PayOS để tránh user thanh toán cho đơn đã hủy
    if (payment.method === PaymentMethod.BANK_TRANSFER) {
        try {
            await this.payos.paymentRequests.cancel(payment.orderId);
        } catch {
            // Bỏ qua lỗi: link có thể đã expired hoặc chưa được tạo
        }
    }

    return this.prisma.payment.update({
        where: { id: paymentId },
        data:  { status: PaymentStatus.FAILED },
    });
}
```

**Tại sao bỏ qua lỗi khi gọi PayOS cancel?**

Link PayOS có thể đã hết hạn hoặc chưa được tạo bao giờ. Dù sao, mục tiêu chính vẫn là cập nhật trạng thái trong DB — việc hủy link trên PayOS chỉ là "best effort".

---

### `GET /payments/check-status/:orderId` — Kiểm tra và đồng bộ trạng thái

```typescript
// Clothesshop/src/services/payment/payment.service.ts

async checkPaymentStatus(orderId: number) {
    const payment = await this.prisma.payment.findFirst({ where: { orderId } });

    if (!payment) throw new NotFoundException('Payment not found');

    // COD không có PayOS — chỉ trả về trạng thái local
    if (payment.method === PaymentMethod.COD) {
        return { orderId, status: payment.status, message: 'COD payment — confirm manually after delivery' };
    }

    try {
        const payosInfo = await this.payos.paymentRequests.get(orderId) as any;

        // Auto-sync: nếu PayOS là PAID nhưng DB vẫn PENDING (webhook chưa đến)
        if (payosInfo.status === 'PAID' && payment.status === PaymentStatus.PENDING) {
            const latestTransaction = payosInfo.transactions?.[payosInfo.transactions.length - 1];

            await this.prisma.$transaction(async (tx) => {
                await tx.payment.update({
                    where: { id: payment.id },
                    data: {
                        status:        PaymentStatus.PAID,
                        transactionId: latestTransaction?.reference ?? null,
                        paidAt:        latestTransaction?.transactionDateTime
                                           ? new Date(latestTransaction.transactionDateTime)
                                           : new Date(),
                    },
                });
                await tx.order.update({
                    where: { id: orderId },
                    data:  { status: OrderStatus.PROCESSED },
                });
            });
        }

        return {
            orderId,
            localStatus: (payosInfo.status === 'PAID' && payment.status === PaymentStatus.PENDING)
                ? PaymentStatus.PAID  // trả về status vừa sync
                : payment.status,
            payosStatus:  payosInfo.status,
            amount:       payosInfo.amount,
            amountPaid:   payosInfo.amountPaid,
            transactions: payosInfo.transactions,
            synced: (payosInfo.status === 'PAID' && payment.status === PaymentStatus.PENDING),
        };
    } catch (error) {
        throw new BadRequestException(`Failed to fetch PayOS status: ${error.message}`);
    }
}
```

**Tại sao cần auto-sync?**

Webhook từ PayOS không đảm bảo 100% đến nơi (lỗi mạng, server không public khi dev ở localhost). Khi client gọi API này để kiểm tra, ta đối chiếu với PayOS và cập nhật ngay nếu phát hiện lệch. `synced: true` trong response báo cho client biết vừa có đồng bộ xảy ra.

---

### `GET /payments/history` — Lịch sử thanh toán

```typescript
// Clothesshop/src/services/payment/payment.service.ts

async getPaymentHistory(filter: FilterPaymentsDto) {
    const { status, fromDate, toDate, page = 1, limit = 10 } = filter;
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };
    if (status) where.status = status;
    if (fromDate || toDate) {
        where.createdAt = {};
        if (fromDate) where.createdAt.gte = new Date(fromDate);
        if (toDate)   where.createdAt.lte = new Date(toDate);
    }

    // Chạy count và findMany song song trong 1 round-trip
    const [total, payments] = await this.prisma.$transaction([
        this.prisma.payment.count({ where }),
        this.prisma.payment.findMany({
            where,
            skip,
            take:    limit,
            orderBy: { createdAt: 'desc' },
            include: {
                order: { include: { user: { select: { id: true, username: true, email: true } } } },
            },
        }),
    ]);

    return {
        data: payments,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
}
```

**Tại sao dùng `$transaction([count, findMany])`?**

Chạy 2 query trong 1 transaction đảm bảo `total` và `data` đếm trên cùng snapshot dữ liệu — tránh race condition khi có thêm record giữa 2 lần query riêng lẻ. Đây là dạng "batch query", không phải transaction ghi dữ liệu.

**Tại sao chỉ `select: { id, username, email }` của user?**

Không cần lấy toàn bộ thông tin user (password hash, địa chỉ...). Chỉ select đúng field cần thiết giúp giảm lượng dữ liệu truyền từ DB.

---

## 5. Bảo mật

| Điểm bảo mật | Cách thực hiện trong code |
|---|---|
| Xác thực webhook | `this.payos.webhooks.verify(webhookBody)` — ký HMAC với `checksumKey` |
| Kiểm tra số tiền | `Number(payment.amount) !== webhookData.amount` → throw nếu lệch |
| Idempotency | Kiểm tra `payment.status === PAID` trước khi xử lý |
| Transaction | `$transaction` khi cập nhật payment + order đồng thời |
| Soft delete | Luôn kèm `isDeleted: false` trong mọi query |
| Env variables | Keys PayOS lấy từ `process.env`, không hardcode |

---

## 6. Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Cách fix |
|-----|-------------|----------|
| `Invalid webhook signature` | Sai `PAYOS_CHECKSUM_KEY` | Kiểm tra lại key trong `.env` và trên dashboard PayOS |
| `Payment already processed` | Webhook gọi lại (retry) | Bình thường — trả 200 OK để PayOS không retry thêm |
| `Payment amount does not match` | Số tiền webhook ≠ DB | Kiểm tra logic tính `amount` khi tạo order |
| `Only BANK_TRANSFER orders can use PayOS` | Gọi create-link với COD order | Chỉ gọi khi `method = BANK_TRANSFER` |
| `Failed to fetch PayOS status` | Lỗi mạng hoặc order chưa có link | Kiểm tra kết nối; đảm bảo đã tạo link trước khi check |

---

## 7. Danh sách API

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/payments/order/:orderId` | Lấy payment theo orderId | ✅ |
| `POST` | `/payments/create-link` | Tạo PayOS checkout link | ✅ |
| `POST` | `/payments/webhook` | Callback từ PayOS | ❌ (Public, dùng HMAC verify) |
| `PATCH` | `/payments/confirm` | Xác nhận COD / admin | ✅ |
| `PATCH` | `/payments/:id/cancel` | Hủy payment | ✅ |
| `GET` | `/payments/history` | Lịch sử thanh toán (có phân trang) | ✅ |
| `GET` | `/payments/check-status/:orderId` | Kiểm tra và đồng bộ trạng thái | ✅ |
