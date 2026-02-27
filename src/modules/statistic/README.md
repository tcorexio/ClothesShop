# STATISTIC MODULE

## Table of Contents
- [1. Overview](#1-overview)
- [2. Architecture](#2-architecture)
- [3. How Statistics Work](#3-how-statistics-work)
- [4. Method Breakdown](#4-method-breakdown)
- [5. Filter & Query Design](#5-filter--query-design)
- [6. API Endpoints](#6-api-endpoints)

---

## 1. Overview

The Statistic module provides three read-only APIs for analyzing shop performance:

| API | What it answers |
|-----|----------------|
| `GET /statistics/revenue` | How much revenue has the shop made? |
| `GET /statistics/orders` | How many orders are in each status? |
| `GET /statistics/top-products` | Which products sell the most? |

All three endpoints accept optional `fromDate` / `toDate` query params to filter by time range.

---

## 2. Architecture

```
StatisticController  →  IStatisticService  →  StatisticService  →  Prisma (DB)
```

The same layered pattern as the rest of the app:
- **Controller** — validates query params, delegates to service
- **Interface** — defines the contract (makes mocking easy for tests)
- **Service** — contains all business logic and DB queries

### Why a separate module?

Statistics are read-only and cross multiple tables (Orders, OrderItems). Keeping them isolated:
- Prevents accidental data mutation
- Makes it easy to add caching or a read replica later
- Keeps OrderService focused on order management

---

## 3. How Statistics Work

### Revenue and Top Products — DELIVERED only

Revenue and top-product stats only count **DELIVERED** orders. This is intentional:

| Status | Counted? | Reason |
|--------|----------|--------|
| PENDING | No | Money not received yet |
| PROCESSED | No | Shipped but not confirmed |
| SHIPPED | No | In transit |
| DELIVERED | **Yes** | Customer received, money confirmed |
| CANCELLED | No | Order was cancelled |

If you counted PENDING orders as revenue, you would be reporting money you haven't actually received.

### Order Stats — all statuses

`getOrderStats` counts **all** orders grouped by status. This gives you a full picture of the pipeline — how many are waiting, processing, delivered, or cancelled.

---

## 4. Method Breakdown

### A. `getRevenueStats(filter)`

**What it does:** Fetches all DELIVERED orders in the date range, then computes three numbers.

```typescript
async getRevenueStats(filter: StatisticFilterDto) {
    const where = this.buildDateFilter(filter);
    where.status = OrderStatus.DELIVERED;

    const orders = await this.prisma.order.findMany({
        where,
        select: { totalPrice: true },  // only fetch what we need
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalPrice), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    ...
}
```

**Why `select: { totalPrice: true }`?**

We only need the price — not the items, address, or user. Selecting only what's needed reduces the amount of data transferred from the database.

**Why `Number(o.totalPrice)`?**

Prisma returns `Decimal` fields as a `Decimal` object (not a plain JS number). You must convert it before doing arithmetic, otherwise `+` would concatenate strings instead of adding numbers.

**Response:**
```json
{
  "totalRevenue": 15000,
  "totalDeliveredOrders": 4,
  "averageOrderValue": 3750
}
```

---

### B. `getOrderStats(filter)`

**What it does:** Groups all orders by status and counts each group.

```typescript
const groupResult = await this.prisma.order.groupBy({
    by: ['status'],
    where,
    _count: { id: true },
});
```

**Why `groupBy` instead of separate queries?**

One `groupBy` query hits the database once and returns all status counts together. The alternative — running a `count()` query for each status — would be 5+ separate DB round trips.

**The transformation step:**

```typescript
// groupBy returns: [{ status: 'PENDING', _count: { id: 5 } }, ...]
// We reshape it into: { PENDING: 5, DELIVERED: 12, ... }
const countByStatus: Record<string, number> = {};
for (const row of groupResult) {
    countByStatus[row.status] = row._count.id;
    totalOrders += row._count.id;
}
```

The raw `groupBy` result is an array of objects, which is harder to use on the frontend. The loop reshapes it into a single flat object that's easier to read and display.

**Response:**
```json
{
  "totalOrders": 8,
  "countByStatus": {
    "PENDING": 2,
    "PROCESSED": 1,
    "SHIPPED": 1,
    "DELIVERED": 4,
    "CANCELLED": 1
  }
}
```

---

### C. `getTopSellingProducts(filter)`

**What it does:** Finds which products sold the most units (by quantity), from DELIVERED orders only.

```typescript
const orderItems = await this.prisma.orderItem.findMany({
    where: {
        order: { ...where, status: OrderStatus.DELIVERED },
    },
    select: { productName: true, quantity: true, price: true },
});
```

**Why query OrderItems instead of Products?**

Products don't store how many units were sold — that information lives in `OrderItem`. Each row in `OrderItem` represents a line in a delivered order.

**Why filter through `order.status` instead of joining separately?**

Prisma lets you filter through a relation directly (`order: { status: DELIVERED }`). This is a single query with a JOIN — cleaner than fetching orders first, then fetching their items.

**The aggregation step:**

```typescript
// Multiple OrderItems can have the same productName (from different orders)
// We need to sum them up into one entry per product
const productMap = new Map<string, { totalQuantity: number; totalRevenue: number }>();

for (const item of orderItems) {
    const existing = productMap.get(item.productName) ?? { totalQuantity: 0, totalRevenue: 0 };
    productMap.set(item.productName, {
        totalQuantity: existing.totalQuantity + item.quantity,
        totalRevenue: existing.totalRevenue + Number(item.price) * item.quantity,
    });
}
```

**Why use a Map?**

A `Map<productName, stats>` lets us accumulate totals per product in O(n) time — one pass through the items array. Using an array with `find()` would be O(n²).

**Sorting and limiting:**

```typescript
.sort((a, b) => b.totalQuantity - a.totalQuantity)  // highest sellers first
.slice(0, limit)                                      // top N only
```

**Response:**
```json
{
  "topProducts": [
    { "productName": "Ao Thun Basic", "totalQuantity": 4, "totalRevenue": 4000 },
    { "productName": "Quan Jean Slim Fit", "totalQuantity": 3, "totalRevenue": 3000 }
  ]
}
```

---

## 5. Filter & Query Design

### `StatisticFilterDto`

```typescript
export class StatisticFilterDto {
    @IsOptional() @IsDateString()
    fromDate?: string;       // e.g. "2026-01-01"

    @IsOptional() @IsDateString()
    toDate?: string;         // e.g. "2026-12-31"

    @IsOptional() @Type(() => Number) @IsInt() @Min(1)
    limit?: number = 10;     // only used by top-products
}
```

All fields are optional. If no date is provided, the query returns all-time data.

### `buildDateFilter(filter)` — shared helper

```typescript
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

**Why a private helper instead of repeating the logic in each method?**

All three methods need the same date filter. Extracting it avoids duplicating the same 6 lines three times — easier to maintain and update.

**Why `isDeleted: false`?**

The app uses soft delete — records are never physically removed, just flagged. Without this filter, cancelled/deleted orders could appear in revenue stats.

---

## 6. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/statistics/revenue` | Total revenue, order count, average value |
| `GET` | `/statistics/orders` | Order count grouped by status |
| `GET` | `/statistics/top-products` | Top selling products by quantity |

### Query Parameters (all optional)

| Param | Type | Default | Used by |
|-------|------|---------|---------|
| `fromDate` | `string` (ISO date) | — | All 3 endpoints |
| `toDate` | `string` (ISO date) | — | All 3 endpoints |
| `limit` | `number` | `10` | `top-products` only |

### Example Requests

```bash
# Revenue for January 2026
GET /statistics/revenue?fromDate=2026-01-01&toDate=2026-01-31

# All-time order stats
GET /statistics/orders

# Top 5 products of all time
GET /statistics/top-products?limit=5
```

### Authentication

All three endpoints require a valid JWT token (same global guard as the rest of the app).
