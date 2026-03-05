# Payment Module — Setup & Testing Guide

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Node.js v20+](https://nodejs.org/) installed
- [Postman](https://www.postman.com/) installed

---

## 1. Start the Database

The project uses PostgreSQL running inside Docker. Start it with:

```bash
docker compose up -d
```

This starts three containers:
- `postgres-db` — PostgreSQL database on port `5432`
- `pgadmin` — Database GUI at `http://localhost:5050`
- `clothesshop-backend` — NestJS server on port `3000`

Wait about 10 seconds for PostgreSQL to be ready before proceeding.

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

This generates TypeScript types from `prisma/schema.prisma` used by the app at runtime.

---

## 4. Run Database Migrations

Migrations create all tables in the database:

```bash
npx prisma migrate dev
```

If you are running this against Docker's PostgreSQL (from your host machine), the `DATABASE_URL` in `.env` points to `postgres:5432` (Docker hostname). You need to temporarily use `localhost:5432` instead:

```bash
# Option A: use the .env.local override
DATABASE_URL="postgresql://clothesshop:clothesshop@localhost:5432/clothesshop" npx prisma migrate dev

# Option B: run migration inside the Docker backend container
docker compose exec backend npx prisma migrate dev
```

---

## 5. Seed Test Data

Populate the database with users, products, and orders for testing:

```bash
npx tsx prisma/seed.ts
```

This creates:
- **3 users**: `admin`, `nguyenvan`, `tranle` (all password: `Test@1234`)
- **5 products** at 1,000–2,000 VND (small prices for safe PayOS testing)
- **8 orders** across all statuses (DELIVERED, SHIPPED, PROCESSED, CANCELLED, PENDING)

---

## 6. Build and Start the Server

```bash
npm run build
npm run start:dev
```

Server runs at `http://localhost:3000`.

If Docker backend is already running (from step 1), you do **not** need to run again locally — just open Postman.

---

## 7. Test Payment APIs in Postman

### Step 1 — Login

```
POST http://localhost:3000/auth/login
Content-Type: application/json

{ "username": "nguyenvan", "password": "Test@1234" }
```

The token is stored in an HTTP-only cookie. Postman sends it automatically on subsequent requests.

---

### Step 2 — Create an Address

```
POST http://localhost:3000/addresses
Content-Type: application/json

{
  "street": "100 Le Loi",
  "city": "Ho Chi Minh",
  "ward": "Phuong 1",
  "phone": "0901111111"
}
```

Note the returned `id`.

---

### Step 3 — Add a Product to Cart

```
POST http://localhost:3000/cart
Content-Type: application/json

{ "variantId": 1, "quantity": 1 }
```

---

### Step 4 — Create an Order

```
POST http://localhost:3000/orders
Content-Type: application/json

{
  "addressId": 1,
  "paymentMethod": "BANK_TRANSFER"
}
```

Note the returned `id` (this is your `orderId`).

---

### Step 5 — Create a PayOS Payment Link

```
POST http://localhost:3000/payments/create-link
Content-Type: application/json

{ "orderId": <orderId> }
```

Response includes `paymentUrl` and `qrCode`. Open `paymentUrl` in a browser to complete the payment (1,000–2,000 VND).

---

### Step 6 — Check Payment Status

After paying, verify the status was updated:

```
GET http://localhost:3000/payments/check-status/<orderId>
```

---

### Other Endpoints

**Confirm COD payment manually (admin):**
```
PATCH http://localhost:3000/payments/confirm
{ "paymentId": <paymentId>, "transactionId": "MANUAL-001" }
```

**Cancel a payment:**
```
PATCH http://localhost:3000/payments/<paymentId>/cancel
```

**View payment history:**
```
GET http://localhost:3000/payments/history
GET http://localhost:3000/payments/history?status=PAID
GET http://localhost:3000/payments/history?fromDate=2026-01-01&toDate=2026-12-31
```

**Get payment by order:**
```
GET http://localhost:3000/payments/order/<orderId>
```

---

## 8. Webhook Testing (PayOS callback)

PayOS needs to call `POST /payments/webhook` from the internet. Since your server runs locally, you need to expose it using [ngrok](https://ngrok.com/):

```bash
ngrok http 3000
```

Copy the generated URL (e.g. `https://abc123.ngrok.io`) and set it as your webhook URL in the [PayOS dashboard](https://payos.vn).

---

## 9. Useful Commands

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start all containers |
| `docker compose down` | Stop all containers |
| `docker compose logs backend -f` | Watch backend logs |
| `npm run build` | Compile TypeScript |
| `npm run start:dev` | Start server (watches dist/) |
| `npx prisma studio` | Open DB browser at localhost:5555 |
| `npx tsx prisma/seed.ts` | Re-seed the database |
