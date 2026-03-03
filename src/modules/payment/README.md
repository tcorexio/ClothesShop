# 📱 PAYMENT MODULE - HƯỚNG DẪN TOÀN DIỆN

## 📋 Mục lục
- [1. Kiến trúc tổng quan](#1-kiến-trúc-tổng-quan)
- [2. Database Schema](#2-database-schema)
- [3. PayOS SDK Integration](#3-payos-sdk-integration)
- [4. Phân tích từng Method](#4-phân-tích-từng-method)
- [5. State Machine](#5-state-machine)
- [6. Security & Best Practices](#6-security--best-practices)
- [7. Flow hoàn chỉnh](#7-flow-hoàn-chỉnh)

---

## 1. Kiến trúc tổng quan

### Layered Architecture Pattern
```
┌─────────────────────────────────────┐
│  Controller Layer                   │  HTTP Requests/Responses
│  (payment.controller.ts)            │  Routing & Validation
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Service Layer                      │  Business Logic
│  (payment.service.ts)               │  PayOS Integration
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Data Layer                         │  Database Operations
│  (Prisma ORM)                       │  SQL Queries
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  PostgreSQL Database                │  Data Storage
└─────────────────────────────────────┘

External: PayOS SDK ← Third-party Payment Gateway
```

### Tại sao phân tách như vậy?

| Layer | Trách nhiệm | Lợi ích |
|-------|-------------|---------|
| **Controller** | Xử lý HTTP (routing, validation) | Dễ test endpoint, không trộn business logic |
| **Service** | Chứa business logic | Tái sử dụng ở nhiều nơi, dễ maintain |
| **Interface** | Định nghĩa contract | Dễ mock khi test, dễ thay implementation |
| **Prisma** | Data access | Type-safe, auto-migration, query builder |

---

## 2. Database Schema

### Model Payment

```prisma
model Payment {
  id            Int           @id @default(autoincrement())
  orderId       Int           @unique @map("order_id")      // 1-1 với Order
  method        PaymentMethod                               // COD / BANK_TRANSFER
  status        PaymentStatus @default(PENDING)             // State machine
  amount        Decimal       @db.Decimal(10, 2)           // Số tiền chính xác
  transactionId String?       @map("transaction_id")       // Mã GD từ bank/PayOS
  paidAt        DateTime?     @map("paid_at")              // Thời điểm thanh toán
  
  createdAt DateTime @default(now())
  isDeleted Boolean @default(false)                        // Soft delete
  
  order Order @relation(...)                               // Quan hệ với Order
}
```

### Giải thích thiết kế

#### 🔑 `orderId` là UNIQUE
- **Lý do**: Mỗi order chỉ có **1 payment record duy nhất**
- **Quan hệ**: 1-1 relationship ngăn duplicate payment
- **Soft delete**: Khi order bị cancel → payment vẫn giữ history (audit trail)

#### 💰 `Decimal(10, 2)` cho amount
- ❌ Không dùng `INT`: Có phần lẻ (đồng)
- ❌ Không dùng `FLOAT`: **Rounding error** (1000.00 → 999.99999)
- ✅ Dùng `Decimal`: Đảm bảo **chính xác tuyệt đối** cho tiền

**Ví dụ float error:**
```javascript
0.1 + 0.2 = 0.30000000000000004 ❌
// Decimal đảm bảo: 0.1 + 0.2 = 0.3 ✅
```

#### 🎫 `transactionId` nullable
- COD payment không có mã giao dịch ngân hàng
- Chỉ có khi BANK_TRANSFER và đã thanh toán thành công

#### 🗑️ Soft delete (`isDeleted`)
- **Không xóa record payment** vì cần audit trail
- Pháp luật yêu cầu giữ lịch sử giao dịch tài chính
- Dễ recovery nếu xóa nhầm

---

## 3. PayOS SDK Integration

### PayOS là gì?

**Payment Gateway** - cổng thanh toán trung gian:
```
Shop (bạn) ←→ PayOS ←→ Ngân hàng (VCB, TCB, MB...)
```

### Workflow thanh toán

```
1. User → Click "Thanh toán"
           ↓
2. Shop tạo payment link từ PayOS SDK
           ↓
3. User scan QR / click link → Chuyển đến trang PayOS
           ↓
4. User nhập thông tin thẻ / chuyển khoản → PayOS xử lý
           ↓
5. PayOS gọi webhook về server shop (xác nhận thanh toán)
           ↓
6. Shop cập nhật DB → Hoàn tất đơn hàng
```

### Khởi tạo PayOS

```typescript
constructor(private readonly prisma: PrismaService) {
    this.payos = new PayOS({
        clientId: process.env.PAYOS_CLIENT_ID,
        apiKey: process.env.PAYOS_API_KEY,
        checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    });
    this.PAYOS_RETURN_URL = process.env.PAYOS_RETURN_URL || '...';
    this.PAYOS_CANCEL_URL = process.env.PAYOS_CANCEL_URL || '...';
}
```

#### Tại sao khởi tạo trong constructor?

| Lý do | Giải thích |
|-------|-----------|
| **Singleton pattern** | Khởi tạo 1 lần, dùng suốt app lifecycle |
| **Tránh overhead** | Không phải tạo connection mới mỗi lần request |
| **Environment Variables** | Bảo mật - không hardcode key vào code |
| **Readonly properties** | Không thể thay đổi sau khi khởi tạo (immutable) |

---

## 4. Phân tích từng Method

### A. `createPaymentLink()` - Tạo link thanh toán

#### Flow

```typescript
async createPaymentLink(dto: CreatePaymentLinkDto) {
    // 1️⃣ Fetch order với payment và items
    const order = await this.prisma.order.findFirst({
        where: { id: dto.orderId },
        include: { payment: true, items: true },
    });
```

**Tại sao include payment + items?**
- `payment`: Kiểm tra method, status
- `items`: Cần gửi danh sách sản phẩm cho PayOS (bắt buộc)

```typescript
    // 2️⃣ Validation layers
    if (!order) throw new NotFoundException();
    if (!order.payment) throw new BadRequestException();
    if (order.payment.method !== "BANK_TRANSFER") 
        throw new BadRequestException("Must be BANK_TRANSFER");
    if (order.payment.status !== PaymentStatus.PENDING) 
        throw new BadRequestException("Already processed");
```

**Tại sao validation nhiều bước?**
- ⚡ **Fail fast**: Dừng sớm nếu điều kiện không đúng
- 🔒 **Security**: Ngăn tạo link duplicate hoặc cho COD payment
- 📝 **UX**: Message lỗi rõ ràng từng case

```typescript
    // 3️⃣ Transform order items → PayOS format
    const items = order.items.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        price: Number(item.price),  // Decimal → Number
    }));
```

**Tại sao Map items?**
- DB schema ≠ PayOS API schema
- PayOS yêu cầu format: `{name, quantity, price}`
- `Number(price)`: Convert Prisma Decimal → JS number

```typescript
    // 4️⃣ Call PayOS SDK
    const paymentData = {
        orderCode: order.id,          // Unique identifier
        amount: Number(order.totalPrice),
        description: `DH${order.id}`, // "DH1", "DH2"...
        returnUrl: this.PAYOS_RETURN_URL,  // Success redirect
        cancelUrl: this.PAYOS_CANCEL_URL,  // Cancel redirect
        items,
    };

    const paymentLink = await this.payos.paymentRequests.create(paymentData);
```

**Return URLs:**
- `returnUrl`: User thanh toán xong → redirect về đây (success page)
- `cancelUrl`: User hủy → redirect về đây (retry hoặc đổi phương thức)

**Response:**
```json
{
  "paymentUrl": "https://pay.payos.vn/web/...",
  "qrCode": "00020101021238600010A000000727...",
  "orderId": 1,
  "amount": "650000"
}
```

---

### B. `handlePayOSWebhook()` - Xử lý callback từ PayOS

#### Webhook là gì?
- PayOS **chủ động gọi** API của bạn khi có sự kiện
- **Server-to-server** communication (không qua browser)
- User thanh toán xong → PayOS gọi webhook → bạn cập nhật DB

#### Flow xử lý

```typescript
async handlePayOSWebhook(webhookBody: PayOSWebhookDto) {
    // 1️⃣ VERIFY SIGNATURE - CRITICAL SECURITY!
    let webhookData;
    try {
        webhookData = await this.payos.webhooks.verify(webhookBody);
    } catch (error) {
        throw new BadRequestException(`Invalid signature`);
    }
```

**🔐 Tại sao phải verify signature?**

| Vấn đề | Giải pháp |
|--------|-----------|
| Hacker giả mạo PayOS | Verify signature → reject |
| MITM attack | HMAC-SHA256 signature |
| Replay attack | Timestamp validation |

**Cách hoạt động:**
```
PayOS sign data = HMAC(data, checksumKey)
     ↓
Shop verify     = HMAC(data, checksumKey)
     ↓
Compare → Match ✅ / Not match ❌
```

```typescript
    // 2️⃣ Check payment success code
    if (webhookBody.code !== "00") {
        throw new BadRequestException(`Failed: ${webhookBody.code}`);
    }
```

**Code meanings:**
- `"00"` = Success ✅
- `"01"` = Failed ❌
- `"02"` = Cancelled 🚫

```typescript
    // 3️⃣ Fetch payment record
    const payment = await this.prisma.payment.findFirst({
        where: {
            orderId: webhookData.orderCode,
            isDeleted: false,
        },
        include: { order: true },
    });
```

```typescript
    // 4️⃣ Amount verification
    if (Number(payment.amount) !== webhookData.amount) {
        throw new BadRequestException("Amount mismatch");
    }
```

**🛡️ Tại sao verify amount?**
- **Double-check fraud**: Frontend có thể bị hack, đổi amount
- **DB là source of truth**: So sánh webhook amount vs DB amount
- **Prevent overpayment/underpayment**

```typescript
    // 5️⃣ Idempotency check
    if (payment.status == PaymentStatus.PAID) {
        return { message: "Payment already processed" }
    }
```

**⚙️ Idempotency là gì?**
- PayOS có thể gọi webhook **nhiều lần** (network retry)
- **Không được xử lý payment 2 lần**
- Kiểm tra status trước → nếu đã PAID → return early

```typescript
    // 6️⃣ Transaction - Update payment và order
    await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
            where: { id: payment.id },
            data: {
                status: PaymentStatus.PAID,
                transactionId: webhookData.reference,
                paidAt: new Date(webhookData.transactionDateTime),
            },
        });

        await tx.order.update({
            where: { id: payment.orderId },
            data: { status: OrderStatus.PROCESSED },
        });
    });
```

**🔄 Tại sao dùng transaction?**

| Scenario | Không dùng TX | Dùng TX |
|----------|---------------|---------|
| Update payment thành công, order fail | Payment PAID, Order PENDING ❌ | Rollback cả 2 ✅ |
| Update order thành công, payment fail | Order PROCESSED, Payment PENDING ❌ | Rollback cả 2 ✅ |
| Cả 2 thành công | OK ✅ | OK ✅ |

**ACID properties:**
- **Atomicity**: All or nothing
- **Consistency**: Data integrity maintained
- **Isolation**: Concurrent transactions don't interfere
- **Durability**: Changes are permanent

---

### C. `confirmPayment()` - Xác nhận thủ công (COD)

```typescript
async confirmPayment(dto: ConfirmPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
        where: { id: dto.paymentId },
        include: { order: true }
    });

    if (payment.status == PaymentStatus.PAID) {
        throw new BadRequestException("Already confirmed");
    }

    await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
            where: { id: payment.id },
            data: {
                status: PaymentStatus.PAID,
                transactionId: dto.transactionId,
                paidAt: new Date(),
            },
        });

        if (payment.order.status == OrderStatus.PENDING) {
            await tx.order.update({
                where: { id: payment.orderId },
                data: { status: OrderStatus.PROCESSED },
            });
        }
    });
}
```

#### Use cases:
1. 📦 **COD**: Shipper giao hàng → nhận tiền mặt → admin confirm
2. 🏦 **Manual transfer**: Chuyển khoản trực tiếp → admin check rồi confirm
3. 💵 **Cash payment**: Khách đến shop trả tiền mặt → staff confirm

**Tại sao cần method này?**
- COD không có webhook tự động
- Cần human verification
- Admin có quyền confirm manual

---

### D. `cancelPayment()` - Hủy thanh toán

```typescript
async cancelPayment(paymentId: number) {
    const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
    });

    if (payment.status == PaymentStatus.PAID) {
        throw new BadRequestException("Cannot cancel paid payment")
    }

    // If BANK_TRANSFER, cancel payment link on PayOS
    if (payment.method === "BANK_TRANSFER") {
        try {
            await this.payos.paymentRequests.cancel(payment.orderId);
        } catch {
            // Ignore if payment link does not exist
        }
    }

    return this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.FAILED },
    });
}
```

#### Tại sao gọi PayOS để cancel?
- Nếu user đã mở link thanh toán → cần **vô hiệu hóa link** đó
- Tránh user thanh toán cho order đã bị hủy
- Invalidate QR code

#### Tại sao catch error + ignore?
- Link có thể đã expired hoặc chưa được tạo
- PayOS có thể đã tự động cancel
- Không quan trọng → vẫn update status trong DB

---

### E. `getPaymentHistory()` - Lịch sử thanh toán

```typescript
async getPaymentHistory(filter: FilterPaymentsDto) {
    const { status, fromDate, toDate, page = 1, limit = 10 } = filter;

    // Dynamic query building
    const where: any = { isDeleted: false };
    
    if (status) where.status = status;
    
    if (fromDate || toDate) {
        where.createdAt = {};
        if (fromDate) where.createdAt.gte = new Date(fromDate);
        if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const total = await this.prisma.payment.count({ where });

    const payments = await this.prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
            order: {
                include: {
                    user: { 
                        select: { id: true, username: true, email: true } 
                    },
                },
            },
        },
    });

    return {
        data: payments,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}
```

#### Dynamic Query Building
Chỉ add filter nếu user cung cấp → flexible queries

```typescript
// Example queries:
// 1. All payments
where = { isDeleted: false }

// 2. Only PAID
where = { isDeleted: false, status: 'PAID' }

// 3. Date range
where = { 
  isDeleted: false, 
  createdAt: { gte: '2024-01-01', lte: '2024-01-31' }
}
```

#### Pagination Design

| Parameter | Ý nghĩa | Ví dụ |
|-----------|---------|-------|
| `page` | Trang hiện tại | 2 |
| `limit` | Số record/trang | 10 |
| `skip` | Bỏ qua N records | (2-1)*10 = 10 |
| `take` | Lấy M records | 10 |

**Response format:**
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 2,
    "limit": 10,
    "totalPages": 10
  }
}
```

Frontend dùng `meta` để render pagination UI.

---

### F. `checkPaymentStatus()` - Kiểm tra trạng thái

```typescript
async checkPaymentStatus(orderId: number) {
    const payment = await this.prisma.payment.findFirst({
        where: { orderId },
    });

    if (payment.method == "COD") {
        return {
            orderId,
            status: payment.status,
            message: "COD payment, manual confirmation required",
        };
    }

    // Check payment status on PayOS
    try {
        const payosInfo = await this.payos.paymentRequests.get(orderId);

        return {
            orderId,
            localStatus: payment.status,
            payosStatus: payosInfo.status,
            // Compare local vs PayOS status
        };
    } catch (error) {
        return {
            orderId,
            status: payment.status,
            message: "Cannot fetch PayOS status",
        };
    }
}
```

#### Tại sao cần check từ PayOS?

| Scenario | Local DB | PayOS | Action |
|----------|----------|-------|--------|
| Webhook chưa về | PENDING | PAID | Sync status |
| Webhook failed | PENDING | PAID | Manual sync |
| Normal case | PAID | PAID | Consistent ✅ |

**Double-check với source of truth** (PayOS server) cho phép **retry manual** nếu webhook failed.

---

## 5. State Machine - Payment Status Flow

```
┌─────────┐
│ PENDING │ ← Khởi tạo payment
└────┬────┘
     │
     ├──[Webhook success]──→ ┌──────┐
     │                        │ PAID │ ← Terminal state
     ├──[Manual confirm]───→  └──────┘
     │
     ├──[Cancel/Timeout]───→ ┌────────┐
     │                        │ FAILED │ ← Terminal state
     └────────────────────────└────────┘
```

### Rules:
- ✅ `PENDING` → `PAID` (one-way)
- ✅ `PENDING` → `FAILED` (one-way)
- ❌ `PAID` → `PENDING` (không cho phép)
- ❌ `FAILED` → `PENDING` (không cho phép)

### Tại sao không cho PAID → PENDING?

| Lý do | Giải thích |
|-------|-----------|
| **Immutability** | Tiền đã thanh toán không thể "chưa thanh toán" |
| **Audit trail** | Giữ lịch sử là PAID forever |
| **Refund** | Tạo record REFUND riêng, không đổi status cũ |
| **Legal** | Tuân thủ quy định kế toán |

---

## 6. Security & Best Practices

### 1️⃣ Environment Variables

```typescript
process.env.PAYOS_CLIENT_ID
process.env.PAYOS_API_KEY
process.env.PAYOS_CHECKSUM_KEY
```

**Rules:**
- ❌ **Never commit** credentials vào Git
- ✅ Lưu trong `.env` (gitignored)
- ✅ Dùng `.env.example` để document
- ✅ Rotate keys định kỳ

### 2️⃣ Webhook Signature Verification

```typescript
webhookData = await this.payos.webhooks.verify(webhookBody);
```

**⚠️ CRITICAL:**
- Không verify = hacker có thể fake payment
- MUST verify mọi webhook request
- Reject nếu signature invalid

### 3️⃣ Transaction Atomicity

```typescript
await this.prisma.$transaction(async (tx) => {
    // Multiple updates here
})
```

**Khi nào dùng transaction?**
- ✅ Update nhiều tables liên quan
- ✅ Business logic phức tạp
- ✅ Cần đảm bảo consistency
- ❌ Single table update (overhead không cần thiết)

### 4️⃣ Soft Delete

```typescript
where: { isDeleted: false }
```

**Benefits:**
- 📊 Giữ history cho audit/compliance
- 🔙 Dễ recovery nếu xóa nhầm
- 📈 Analytics vẫn có data đầy đủ
- ⚖️ Legal requirement cho financial data

### 5️⃣ Amount Verification

```typescript
if (Number(payment.amount) !== webhookData.amount) {
    throw new BadRequestException("Amount mismatch");
}
```

**Ngăn chặn:**
- 💰 Payment tampering
- 🎭 Frontend manipulation
- 🔓 Price modification attacks

### 6️⃣ Idempotency

```typescript
if (payment.status == PaymentStatus.PAID) {
    return { message: "Already processed" };
}
```

**Prevent:**
- 🔁 Duplicate processing
- 💸 Double charging
- 🐛 Race conditions

---

## 7. Flow hoàn chỉnh

### 🛒 E-commerce Payment Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. CREATE ORDER                                         │
│    POST /orders                                         │
│    → OrderService tạo Order + Payment (PENDING)        │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 2. CREATE PAYMENT LINK                                  │
│    POST /payments/create-link                           │
│    → PaymentService gọi PayOS SDK                       │
│    → Trả về: paymentUrl + qrCode                        │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 3. USER THANH TOÁN                                      │
│    User scan QR / click link                            │
│    → Chuyển đến trang PayOS                             │
│    → Nhập thông tin thẻ / chuyển khoản                  │
│    → PayOS xử lý với ngân hàng                          │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 4. WEBHOOK CALLBACK                                     │
│    POST /payments/webhook (từ PayOS)                    │
│    → PaymentService verify signature                    │
│    → Cập nhật: Payment = PAID, Order = PROCESSED       │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ 5. CHECK STATUS / HISTORY                               │
│    GET /payments/check-status/:orderId                  │
│    GET /payments/history?status=PAID                    │
└─────────────────────────────────────────────────────────┘
```

### 🚫 Cancel Flow

```
User/Admin → PATCH /payments/:id/cancel
           ↓
PaymentService → Check status (không PAID)
           ↓
Gọi PayOS SDK → Invalidate payment link
           ↓
Update DB → status = FAILED
           ↓
Return canceled payment
```

### 💵 COD Flow

```
User → Tạo order với method = COD
     ↓
Payment status = PENDING (DB)
     ↓
Shipper giao hàng → Nhận tiền mặt
     ↓
Admin → PATCH /payments/confirm
     ↓
PaymentService → Update PAID + paidAt
     ↓
Order status → PROCESSED
```

---

## 8. API Endpoints Summary

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/payments/order/:orderId` | Lấy payment theo orderId | ✅ |
| `POST` | `/payments/create-link` | Tạo PayOS payment link | ✅ |
| `POST` | `/payments/webhook` | Webhook từ PayOS | ❌ (verify signature) |
| `PATCH` | `/payments/confirm` | Xác nhận COD/manual | ✅ Admin |
| `PATCH` | `/payments/:id/cancel` | Hủy payment | ✅ |
| `GET` | `/payments/history` | Lịch sử thanh toán | ✅ |
| `GET` | `/payments/check-status/:orderId` | Kiểm tra status | ✅ |

---

## 9. Error Handling

### Common Errors

```typescript
// 404 Not Found
throw new NotFoundException("Payment not found");

// 400 Bad Request
throw new BadRequestException("Payment already processed");
throw new BadRequestException("Amount mismatch");
throw new BadRequestException("Invalid webhook signature");

// 500 Internal Server Error
try {
    await this.payos.paymentRequests.create(data);
} catch (error) {
    console.error('PayOS error:', error);
    throw new BadRequestException(`Failed: ${error.message}`);
}
```

### Logging Strategy

```typescript
// Constructor
console.log('PayOS Credentials Check:', {
    clientId: process.env.PAYOS_CLIENT_ID ? 'EXISTS' : 'MISSING',
    apiKey: process.env.PAYOS_API_KEY ? 'EXISTS' : 'MISSING',
});

// Creating payment link
console.log('PayOS request:', JSON.stringify(paymentData, null, 2));

// Error
console.error('PayOS error details:', error);
```

**Best practices:**
- ✅ Log credentials check at startup
- ✅ Log request data (sensitive data masked)
- ✅ Log error details for debugging
- ❌ Never log full credentials
- ❌ Never log sensitive user data

---

## 10. Testing

### Unit Test Example

```typescript
describe('PaymentService', () => {
    it('should create payment link', async () => {
        const mockOrder = {
            id: 1,
            totalPrice: 100000,
            items: [{...}],
            payment: { method: 'BANK_TRANSFER', status: 'PENDING' }
        };
        
        jest.spyOn(prisma.order, 'findFirst').mockResolvedValue(mockOrder);
        jest.spyOn(payos.paymentRequests, 'create').mockResolvedValue({
            checkoutUrl: 'https://...',
            qrCode: '...'
        });
        
        const result = await paymentService.createPaymentLink({ orderId: 1 });
        
        expect(result.paymentUrl).toBeDefined();
    });
});
```

### Integration Test Example

```typescript
describe('Payment E2E', () => {
    it('should complete payment flow', async () => {
        // 1. Create order
        const order = await request(app).post('/orders').send({...});
        
        // 2. Create payment link
        const link = await request(app)
            .post('/payments/create-link')
            .send({ orderId: order.id });
        
        // 3. Simulate webhook
        const webhook = await request(app)
            .post('/payments/webhook')
            .send({ code: '00', ... });
        
        // 4. Check status
        const payment = await request(app)
            .get(`/payments/order/${order.id}`);
        
        expect(payment.status).toBe('PAID');
    });
});
```

---

## 11. Deployment Checklist

### Environment Variables
```bash
# .env.production
PAYOS_CLIENT_ID=your_production_client_id
PAYOS_API_KEY=your_production_api_key
PAYOS_CHECKSUM_KEY=your_production_checksum_key
PAYOS_RETURN_URL=https://yourdomain.com/payment/success
PAYOS_CANCEL_URL=https://yourdomain.com/payment/cancel
DATABASE_URL=postgresql://user:pass@host:5432/db
```

### Pre-deployment Steps
- ✅ Test webhook endpoint với PayOS sandbox
- ✅ Verify SSL certificate (webhook endpoint phải HTTPS)
- ✅ Setup monitoring/logging (Sentry, LogRocket)
- ✅ Test transaction rollback
- ✅ Load testing payment flow
- ✅ Backup database
- ✅ Document rollback procedure

### Monitoring
```typescript
// Add metrics
const paymentDuration = Date.now() - startTime;
logger.info('Payment processed', {
    orderId,
    amount,
    duration: paymentDuration,
    status: 'success'
});
```

---

## 12. Troubleshooting

### Common Issues

#### ❌ "Invalid webhook signature"
**Cause:** Sai `checksumKey` hoặc webhook data bị modify
**Fix:** 
- Kiểm tra `PAYOS_CHECKSUM_KEY` trong .env
- Verify webhook URL trong PayOS dashboard

#### ❌ "Payment already processed"
**Cause:** Webhook retry hoặc duplicate request
**Fix:** 
- Đây là expected behavior (idempotency)
- Return 200 OK để PayOS không retry

#### ❌ "Amount mismatch"
**Cause:** Frontend bị hack hoặc price thay đổi
**Fix:**
- Validate amount ở backend trước khi tạo order
- Lock price khi tạo payment

#### ❌ "Cannot fetch PayOS status"
**Cause:** Network issue hoặc payment không tồn tại trên PayOS
**Fix:**
- Check network connectivity
- Verify orderCode/paymentLinkId

---

## 📚 References

- [PayOS Documentation](https://payos.vn/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Payment Gateway Best Practices](https://stripe.com/docs/security/guide)

---

## 🤝 Contributing

Nếu cần thêm tính năng:
1. Refund payment
2. Partial payment
3. Installment payment
4. Multiple payment methods
5. Payment analytics dashboard

Liên hệ team để discuss implementation.

---

**Last Updated:** February 21, 2026
**Version:** 1.0.0
**Maintainer:** Development Team
