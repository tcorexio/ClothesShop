# Statistic Module — Setup & Testing Guide

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Node.js v20+](https://nodejs.org/) installed
- [Postman](https://www.postman.com/) installed

---

## 1. Start the Database

```bash
docker compose up -d
```

This starts:
- `postgres-db` — PostgreSQL on port `5432`
- `clothesshop-backend` — NestJS server on port `3000`
- `pgadmin` — DB browser at `http://localhost:5050`

Wait ~10 seconds for the database to be ready.

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Generate Prisma Client

```bash
npx prisma generate
```

---

## 4. Run Database Migrations

```bash
# Run inside the Docker container (safest option)
docker compose exec backend npx prisma migrate dev

# Or locally using localhost instead of Docker hostname
DATABASE_URL="postgresql://clothesshop:clothesshop@localhost:5432/clothesshop" npx prisma migrate dev
```

---

## 5. Seed Test Data

The seed creates 8 orders across all statuses so the statistics have meaningful data to display:

```bash
npx tsx prisma/seed.ts
```

What gets seeded:

| Type | Count |
|------|-------|
| Users | 3 (admin, nguyenvan, tranle) |
| Products | 5 (1,000–2,000 VND each) |
| Orders | 8 (4 DELIVERED, 1 SHIPPED, 1 PROCESSED, 1 CANCELLED, 1 PENDING) |
| Payments | 8 |

Password for all accounts: `Test@1234`

---

## 6. Build and Start the Server

```bash
npm run build
npm run start:dev
```

Server runs at `http://localhost:3000`.

If Docker backend started in step 1, the server is already running — skip this step.

---

## 7. Test Statistics APIs in Postman

### Step 1 — Login

```
POST http://localhost:3000/auth/login
Content-Type: application/json

{ "username": "nguyenvan", "password": "Test@1234" }
```

The token is stored in a cookie. Postman sends it automatically on all subsequent requests.

---

### Step 2 — Revenue Statistics

Returns total revenue, number of delivered orders, and average order value.
Only counts DELIVERED orders.

```
GET http://localhost:3000/statistics/revenue
```

Expected response (with seed data):
```json
{
  "totalRevenue": 15000,
  "totalDeliveredOrders": 4,
  "averageOrderValue": 3750
}
```

---

### Step 3 — Order Statistics

Returns total order count grouped by status.

```
GET http://localhost:3000/statistics/orders
```

Expected response:
```json
{
  "totalOrders": 8,
  "countByStatus": {
    "DELIVERED": 4,
    "SHIPPED": 1,
    "PROCESSED": 1,
    "CANCELLED": 1,
    "PENDING": 1
  }
}
```

---

### Step 4 — Top Selling Products

Returns products ranked by quantity sold, from DELIVERED orders only.

```
GET http://localhost:3000/statistics/top-products
```

Get top 3 only:
```
GET http://localhost:3000/statistics/top-products?limit=3
```

Expected response:
```json
{
  "topProducts": [
    { "productName": "Ao Thun Basic", "totalQuantity": 4, "totalRevenue": 4000 },
    { "productName": "Quan Jean Slim Fit", "totalQuantity": 3, "totalRevenue": 3000 },
    { "productName": "Ao Polo Classic", "totalQuantity": 3, "totalRevenue": 6000 }
  ]
}
```

---

## 8. Filter by Date Range

All three endpoints accept optional `fromDate` and `toDate` query parameters.

**Revenue for January 2026:**
```
GET http://localhost:3000/statistics/revenue?fromDate=2026-01-01&toDate=2026-01-31
```

**Orders in February 2026:**
```
GET http://localhost:3000/statistics/orders?fromDate=2026-02-01&toDate=2026-02-28
```

**Top 5 products all time:**
```
GET http://localhost:3000/statistics/top-products?limit=5
```

**Top 5 products in a date range:**
```
GET http://localhost:3000/statistics/top-products?fromDate=2026-01-01&toDate=2026-01-31&limit=5
```

---

## 9. Re-seeding After Data Changes

If you create real orders through the API and want to reset to clean test data:

```bash
# Wipe all order-related tables
docker compose exec postgres psql -U clothesshop -d clothesshop \
  -c "TRUNCATE payments, order_items, orders, order_addresses, cart_items, carts, product_variants, products, categories RESTART IDENTITY CASCADE;"

# Re-seed
npx tsx prisma/seed.ts
```

---

## 10. Useful Commands

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start all containers |
| `docker compose down` | Stop all containers |
| `docker compose logs backend -f` | Watch backend logs |
| `npm run build` | Compile TypeScript |
| `npm run start:dev` | Start server (watches dist/) |
| `npx tsx prisma/seed.ts` | Re-seed the database |
| `npx prisma studio` | Open DB browser at localhost:5555 |
