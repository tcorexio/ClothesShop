# Module Thống Kê (Statistic)

## Mục lục
- [1. Tổng quan](#1-tổng-quan)
- [2. Quy tắc tính toán](#2-quy-tắc-tính-toán)
- [3. Giải thích từng API](#3-giải-thích-từng-api)
- [4. Bộ lọc thời gian](#4-bộ-lọc-thời-gian)
- [5. Danh sách API](#5-danh-sách-api)

---

## 1. Tổng quan

Module này cung cấp 3 API chỉ đọc để xem hiệu quả kinh doanh:

| API | Trả về |
|-----|--------|
| `GET /statistics/revenue` | Tổng doanh thu, số đơn đã giao, giá trị đơn trung bình |
| `GET /statistics/orders` | Số lượng đơn theo từng trạng thái |
| `GET /statistics/top-products` | Sản phẩm bán chạy nhất theo số lượng |

Cả 3 đều hỗ trợ lọc theo khoảng thời gian (`fromDate` / `toDate`).

### Kiến trúc

```
Client → StatisticController → StatisticService → Prisma (DB)
```

Module được tách biệt để:
- Không ảnh hưởng đến các module khác (chỉ đọc, không ghi)
- Dễ mở rộng thêm cache hoặc read replica sau này

---

## 2. Quy tắc tính toán

### Doanh thu và sản phẩm bán chạy — chỉ tính đơn DELIVERED

| Trạng thái | Được tính? | Lý do |
|---|---|---|
| `PENDING` | Không | Chưa chắc thu được tiền |
| `PROCESSED` | Không | Đang xử lý, chưa giao |
| `SHIPPED` | Không | Đang trên đường giao |
| `DELIVERED` | **Có** | Khách đã nhận hàng, tiền đã thu |
| `CANCELLED` | Không | Đơn bị hủy |

### Thống kê đơn hàng — tính tất cả trạng thái

`getOrderStats` đếm **tất cả đơn** để cho thấy toàn cảnh pipeline: bao nhiêu đơn đang chờ, đang giao, đã giao, đã hủy.

---

## 3. Giải thích từng API

### `GET /statistics/revenue` — Doanh thu

```typescript
// Clothesshop/src/services/statistic/statistic.service.ts

async getRevenueStats(filter: StatisticFilterDto) {
    const where = this.buildDateFilter(filter);
    where.status = OrderStatus.DELIVERED;   // Chỉ tính đơn đã giao

    const orders = await this.prisma.order.findMany({
        where,
        select: { totalPrice: true },       // Chỉ lấy cột cần thiết
    });

    const totalOrders  = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalPrice), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
        totalRevenue:        Math.round(totalRevenue),
        totalDeliveredOrders: totalOrders,
        averageOrderValue:   Math.round(averageOrderValue),
    };
}
```

**Tại sao `select: { totalPrice: true }` thay vì lấy toàn bộ order?**

Chỉ cần giá tiền để tính tổng — không cần địa chỉ, user, items... Chỉ select đúng cột giúp giảm đáng kể lượng dữ liệu truyền từ DB về server.

**Tại sao `Number(o.totalPrice)`?**

Prisma trả về `Decimal` fields dưới dạng object đặc biệt, không phải số JS thông thường. Nếu bỏ `Number()`, phép cộng `+` sẽ nối chuỗi thay vì cộng số.

**Tại sao `Math.round`?**

`totalPrice` lưu dạng `Decimal(10,2)`, division có thể ra số thập phân dài. `Math.round` đảm bảo response trả về số nguyên sạch, dễ hiển thị trên UI.

**Response:**
```json
{
    "totalRevenue": 50000,
    "totalDeliveredOrders": 4,
    "averageOrderValue": 12500
}
```

---

### `GET /statistics/orders` — Thống kê đơn hàng

```typescript
// Clothesshop/src/services/statistic/statistic.service.ts

async getOrderStats(filter: StatisticFilterDto) {
    const where = this.buildDateFilter(filter);

    const groupResult = await this.prisma.order.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
    });

    // Prisma trả về array — chuyển thành object phẳng để dễ dùng hơn
    const countByStatus: Record<string, number> = {};
    let totalOrders = 0;

    for (const row of groupResult) {
        countByStatus[row.status] = row._count.id;
        totalOrders += row._count.id;
    }

    return { totalOrders, countByStatus };
}
```

**Tại sao dùng `groupBy` thay vì chạy `count()` riêng cho từng status?**

Một câu `groupBy` duy nhất trả về số lượng của tất cả status trong 1 round-trip đến DB. Nếu chạy `count()` riêng cho mỗi status (PENDING, PROCESSED, SHIPPED, DELIVERED, CANCELLED) sẽ cần 5 query — tốn gấp 5 lần.

**Tại sao phải transform kết quả?**

Prisma trả về dạng array `[{ status: 'PENDING', _count: { id: 5 } }, ...]` — không thực tế để dùng trực tiếp ở frontend. Vòng lặp chuyển sang object phẳng `{ PENDING: 5, DELIVERED: 12 }` dễ đọc và dễ render hơn.

**Response:**
```json
{
    "totalOrders": 8,
    "countByStatus": {
        "PENDING": 2,
        "PROCESSED": 1,
        "SHIPPED": 1,
        "DELIVERED": 4,
        "CANCELLED": 0
    }
}
```

---

### `GET /statistics/top-products` — Sản phẩm bán chạy

```typescript
// Clothesshop/src/services/statistic/statistic.service.ts

async getTopSellingProducts(filter: StatisticFilterDto) {
    const { limit = 10 } = filter;
    const where = this.buildDateFilter(filter);

    // Lấy OrderItems từ đơn DELIVERED thông qua relation filter
    const orderItems = await this.prisma.orderItem.findMany({
        where: {
            order: { ...where, status: OrderStatus.DELIVERED },
        },
        select: { productName: true, quantity: true, price: true },
    });

    // Gom nhóm theo tên sản phẩm, cộng dồn số lượng và doanh thu
    const productMap = new Map<string, { totalQuantity: number; totalRevenue: number }>();

    for (const item of orderItems) {
        const existing = productMap.get(item.productName) ?? { totalQuantity: 0, totalRevenue: 0 };
        productMap.set(item.productName, {
            totalQuantity: existing.totalQuantity + item.quantity,
            totalRevenue:  existing.totalRevenue + Number(item.price) * item.quantity,
        });
    }

    // Chuyển Map thành array → sort giảm dần → lấy top N
    const topProducts = Array.from(productMap.entries())
        .map(([productName, stats]) => ({
            productName,
            totalQuantity: stats.totalQuantity,
            totalRevenue:  Math.round(stats.totalRevenue),
        }))
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, limit);

    return { topProducts };
}
```

**Tại sao query `OrderItem` thay vì `Product`?**

Bảng `Product` không lưu thông tin doanh số — chỉ có thông tin sản phẩm (tên, giá niêm yết). Số lượng đã bán thực tế nằm ở `OrderItem`, mỗi row là một sản phẩm trong một đơn hàng đã giao.

**Tại sao filter `order: { status: DELIVERED }` thay vì join riêng?**

Prisma cho phép filter qua relation trực tiếp — tương đương với một câu SQL JOIN trong một query duy nhất. Cách này gọn hơn và không cần fetch orders trước rồi mới fetch items.

**Tại sao dùng `Map` để gom nhóm?**

Cùng một sản phẩm có thể xuất hiện trong nhiều đơn hàng → nhiều rows `OrderItem` khác nhau. Dùng `Map<productName, stats>` để cộng dồn trong một lần duyệt O(n). Nếu dùng `Array.find()` thay thế sẽ là O(n²) — chậm hơn khi có nhiều sản phẩm.

**Response:**
```json
{
    "topProducts": [
        { "productName": "Ao Thun Basic", "totalQuantity": 10, "totalRevenue": 50000 },
        { "productName": "Quan Jean Slim", "totalQuantity": 7,  "totalRevenue": 42000 }
    ]
}
```

---

## 4. Bộ lọc thời gian

Ba API dùng chung hàm private `buildDateFilter`:

```typescript
// Clothesshop/src/services/statistic/statistic.service.ts

private buildDateFilter(filter: StatisticFilterDto) {
    const where: any = { isDeleted: false };

    if (filter.fromDate || filter.toDate) {
        where.createdAt = {};
        if (filter.fromDate) where.createdAt.gte = new Date(filter.fromDate);
        if (filter.toDate)   where.createdAt.lte = new Date(filter.toDate);
    }

    return where;
}
```

**Tại sao tách ra hàm riêng?**

Cả 3 method đều cần cùng logic lọc ngày. Nếu viết lặp lại trong mỗi method, khi cần sửa phải sửa ở 3 chỗ — dễ gây lỗi không đồng bộ. Tách ra hàm private → sửa một lần, áp dụng cho cả 3.

**Tại sao luôn kèm `isDeleted: false`?**

App dùng soft delete — record không bị xóa khỏi DB mà chỉ được đánh dấu `isDeleted = true`. Không có filter này, các đơn hàng đã bị xóa vẫn sẽ xuất hiện trong thống kê.

### Tham số query

| Tham số | Kiểu | Mặc định | Dùng cho |
|---|---|---|---|
| `fromDate` | ISO date string | — | Cả 3 API |
| `toDate` | ISO date string | — | Cả 3 API |
| `limit` | number | `10` | Chỉ `top-products` |

### Ví dụ request

```bash
# Doanh thu tháng 1/2026
GET /statistics/revenue?fromDate=2026-01-01&toDate=2026-01-31

# Thống kê đơn hàng toàn thời gian
GET /statistics/orders

# Top 5 sản phẩm bán chạy nhất
GET /statistics/top-products?limit=5
```

---

## 5. Danh sách API

| Method | Endpoint | Mô tả | Yêu cầu đăng nhập |
|---|---|---|---|
| `GET` | `/statistics/revenue` | Doanh thu và giá trị đơn trung bình | Có |
| `GET` | `/statistics/orders` | Số đơn theo từng trạng thái | Có |
| `GET` | `/statistics/top-products` | Sản phẩm bán chạy nhất | Có |
