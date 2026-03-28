# 📚 ClothesShop - Complete API Collection & Testing Guide

## 📥 Import to Postman

1. **Open Postman**
2. **Click**: File → Import
3. **Select**: `ClothesShop-Complete-API.postman_collection.json`

---

## 🔄 API Flow/Workflow

### **1️⃣ Authentication Flow**
```
Sign Up / Login (Get Token)
    ↓
Set admin_token & customer_token in environment
```

**Steps:**
- Sign Up → Login as Customer (saves `customer_token`)
- Admin Login (saves `admin_token`)

---

### **2️⃣ Product Management Flow**
```
Admin → Create Product
   ↓
Get All Products / Search / Filter
   ↓
View Product Details
   ↓
Update Product (Admin)
   ↓
Delete Product (Soft Delete)
```

**Key Endpoints:**
- `POST /products` - Create (Admin only)
- `GET /products` - List with pagination
- `GET /products/search` - Search by keyword
- `GET /products/by-category/:id` - Filter by category
- `GET /products/by-price-range` - Filter by price
- `PATCH /products/:id` - Update (Admin)
- `DELETE /products/:id` - Soft delete (Admin)

---

### **3️⃣ Shopping Cart Flow**
```
View Products
   ↓
Add to Cart (Create Cart Item)
   ↓
View Cart
   ↓
Update Quantity
   ↓
Remove from Cart
```

**Key Endpoints:**
- `POST /cart` - Add item (Customer)
- `GET /cart` - View cart (Customer)
- `PATCH /cart/:id` - Update quantity (Customer)
- `DELETE /cart/:id` - Remove item (Customer)

---

### **4️⃣ Order & Payment Flow** ⭐ Main Workflow
```
1️⃣ Create Order
        ↓
   Confirm Order Details
        ↓
2️⃣ Create Payment Link (BANK_TRANSFER / COD)
        ↓
   Copy Payment Link / Complete Payment
        ↓
3️⃣ Confirm Payment
        ↓
   Order Status: PROCESSED
        ↓
4️⃣ Admin Updates Status:
   PROCESSED → SHIPPED → DELIVERED
```

**Key Endpoints:**
- `POST /orders` - Create order (Customer)
- `GET /orders` - View my orders (Customer)
- `GET /orders/:id` - Order details (Customer)
- `POST /payments/create-link` - Create payment link
- `POST /payments/confirm` - Confirm payment
- `PATCH /orders/:id/status` - Update status (Admin)
- `POST /orders/:id/cancel` - Cancel order (Customer)

---

### **5️⃣ Review Flow**
```
Order Delivered
   ↓
Create Review (Rating + Comment)
   ↓
View Product Reviews
   ↓
View Rating Summary
   ↓
Update Review (if needed)
```

**Key Endpoints:**
- `POST /reviews` - Create review (Customer)
- `GET /reviews/product/:id` - Get product reviews
- `GET /reviews/product/:id/summary` - Rating summary
- `PATCH /reviews/:id` - Update review

---

### **6️⃣ User Management**
```
Manage Profile
   ↓
Update Personal Info
   ↓
Change Password
   ↓
Manage Addresses
```

**Key Endpoints:**
- `GET /users/profile` - View profile
- `PATCH /users/profile` - Update profile
- `POST /auth/change-password` - Change password
- `POST /addresses` - Create address
- `GET /addresses` - View addresses
- `PATCH /addresses/:id` - Update address
- `DELETE /addresses/:id` - Delete address

---

## 🎯 Testing Scenarios

### **Scenario 1: Customer Journey**
1. Sign Up / Login
2. Browse Products (Search/Filter/Category)
3. Check Product Details & Stock
4. Add Products to Cart
5. Create Order
6. Confirm Payment
7. View Orders
8. Leave Review
9. View Profile & Manage Addresses

### **Scenario 2: Admin Operations**
1. Admin Login
2. Create Product
3. Update Product
4. View All Orders
5. Update Order Status
6. View Statistics/Dashboard

---

## 📋 Environment Variables

| Variable | Type | Example |
|----------|------|---------|
| `base_url` | String | http://localhost:3000 |
| `admin_token` | JWT | eyJhbGc... (Auto-filled) |
| `customer_token` | JWT | eyJhbGc... (Auto-filled) |
| `user_id` | Number | 1 (Auto-filled) |
| `product_id` | Number | 1 (Manual/Auto-filled) |
| `cart_item_id` | Number | - (Auto-filled) |
| `order_id` | Number | - (Auto-filled) |
| `review_id` | Number | - (Auto-filled) |
| `address_id` | Number | - (Auto-filled) |

---

## 🚀 Quick Start

### **For Local Testing:**
1. Start Docker: `docker compose up --build`
2. Wait for services to be ready
3. Login as Admin first to get `admin_token`
4. Then login as Customer to get `customer_token`
5. Use variables in subsequent requests

### **Test Data (from seed.ts):**
- **Admin User:**
  - Username: `admin`
  - Password: `Admin@123456`
  - Role: `ADMIN`

- **Customer Users:**
  - Username: `customer1` / Password: `Customer@123456`
  - Username: `customer2` / Password: `Customer@123456`
  - Role: `CUSTOMER`

---

## ✅ Testing Checklist

- [ ] Auth: Sign Up, Login, Logout
- [ ] Products: Create, Read, Update, Delete, Search, Filter
- [ ] Cart: Add, View, Update, Remove
- [ ] Orders: Create, View, Cancel, Update Status
- [ ] Payments: Create Link, Confirm Payment
- [ ] Reviews: Create, View, Update
- [ ] User: Profile, Password, Addresses
- [ ] Statistics: Dashboard, Sales Report

---

## 📝 Notes

- **Auto-fill tokens**: Sign Up/Login endpoints auto-save tokens to environment
- **Auto-fill IDs**: Create endpoints auto-save created resource IDs
- **Bearer Auth**: All protected endpoints use `{{admin_token}}` or `{{customer_token}}`
- **Pagination**: Use `?page=1&limit=10` in GET list endpoints
- **Timestamps**: Check `createdAt`, `updatedAt` fields in responses

---

## 🐛 Troubleshooting

**401 Unauthorized**: Check token is not expired, re-login
**403 Forbidden**: Check role (Admin vs Customer)
**400 Bad Request**: Validate request body/parameters
**404 Not Found**: Check resource ID exists
**500 Server Error**: Check Docker containers are running: `docker ps`

---

## 🔗 Additional Resources

- **API Docs**: http://localhost:3000/api-docs (Swagger)
- **Database**: http://localhost:5050 (PgAdmin)
- **Prisma Studio**: `npm run prisma:studio`

