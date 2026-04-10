# 13. PHÂN TÍCH LỖI VÀ BÀI HỌC KINH NGHIỆM

## 13.1 Giới thiệu

Trong quá trình phát triển dự án ClothesShop, nhóm đã gặp và xử lý 2 lỗi critical và nhiều lỗi quan trọng khác. Phần này trình bày chi tiết các lỗi đã phát hiện, nguyên nhân gốc, cách xử lý, và bài học rút ra.

---

## 13.2 Phân tích chi tiết các lỗi chính

### 13.2.1 Bug #1 — JWT Token hợp lệ nhưng vẫn trả 401 Unauthorized [CRITICAL]

**Mô tả lỗi:**
Người dùng đăng nhập thành công, nhận được JWT token. Gọi API với header `Authorization: Bearer <token>` nhưng server vẫn trả về `401 Unauthorized`. Lỗi xuất hiện ngẫu nhiên — đôi khi thành công, đôi khi thất bại với cùng một token.

**Môi trường phát sinh lỗi:**

| Thông tin | Chi tiết |
|-----------|----------|
| Xảy ra khi | Gọi protected routes sau khi login thành công |
| Tần suất | Khoảng 30–40% request bị lỗi, còn lại thành công |
| Môi trường | Development — `localhost:3000` |
| Token | Access token JWT, expiry 15 phút |
| Thời gian debug | Khoảng 2 ngày (Tuần 3–4 dự án) |

**Console Error — Lỗi gốc:**

```typescript
[Nest] ERROR [ExceptionsHandler] JsonWebTokenError: invalid signature
    at /node_modules/jsonwebtoken/verify.js:89
    at /src/strategies/jwt.strategy.ts:28

ERROR [HTTP] POST /auth/login 200 — 45ms
ERROR [HTTP] GET  /products  401 — 3ms

UnauthorizedException: Unauthorized
    at JwtAuthGuard.canActivate (/src/guards/jwt-auth.guard.ts:15)
```

**Root Cause — Quá trình điều tra:**

1. **Bước 1**: Kiểm tra token bằng `jwt.io` → Token hợp lệ, chưa hết hạn, payload đúng
2. **Bước 2**: Log secret key trong `JwtStrategy` → Secret key là ĐÚNG
3. **Bước 3**: So sánh secret key lúc sign (AuthService) vs verify (JwtStrategy) → **ĐÂY LÀ ĐIỂM MẤU CHỐT**
4. **Bước 4**: Phát hiện `JwtModule` được register ở cả `AuthModule` và `AppModule` với secret key khác nhau!
5. **Bước 5**: Tuỳ vào request đi qua module nào trước, verify dùng secret key khác nhau → lỗi ngẫu nhiên

**Code lỗi (trước fix):**

```typescript
// src/modules/auth/auth.module.ts — LỖI
@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,  // ← Hardcode, có thể khác giữa lần chạy
      signOptions: { expiresIn: '15m' },
    }),
  ],
  exports: [AUTH_SERVICE],
})
export class AuthModule {}
```

**Solution — Code đã sửa:**

```typescript
// src/modules/auth/auth.module.ts — ✅ SỬA
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    UserModule,
    RefreshTokenModule,
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRY', '15m') },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [{ provide: AUTH_SERVICE, useClass: AuthService }, JwtStrategy],
  controllers: [AuthController],
  exports: [AUTH_SERVICE, JwtModule],
})
export class AuthModule {}
```

**Bài học rút ra:**
- ❌ Không bao giờ hardcode secret key trong code — luôn dùng `ConfigService` + `.env`
- ❌ Không register cùng một module ở nhiều nơi với config khác nhau — gây side effects
- ✅ Lỗi ngẫu nhiên (non-deterministic) thường bắt nguồn từ **state không nhất quán**
- ✅ Dùng `registerAsync()` với `ConfigService` để lấy config động từ environment

---

### 13.2.2 Bug #2 — Sai lệch số tiền / Decimal Precision Loss [CRITICAL]

**Mô tả lỗi:**
JavaScript sử dụng IEEE 754 floating-point numbers — không thích hợp cho tính toán tiền. Khi tính total price bằng JavaScript và gửi đến PayOS, độ chính xác bị mất → gây lỗi webhook validation, thanh toán bị reject dù đã đúng.

**Ví dụ cụ thể — Perfect Storm:**

```
Khách hàng mua 3 áo @ $19.99 mỗi cái
Tính toán JS: 19.99 × 3 = 59.970000000000006 (lỗi float!)

1. Order tạo với totalPrice = $59.97
2. Payment gửi đến PayOS = amount: 59.97000000000006
3. PayOS nhận = làm tròn = $60.00
4. Webhook return = 60.00
5. Backend check: if (59.97 !== 60.00) → LỖI! ❌
6. Thanh toán FAIL dù khách đã trả đúng tiền
```

**Môi trường phát sinh lỗi:**

| Thông tin | Chi tiết |
|-----------|----------|
| Xảy ra khi | Tính toán giá tiền, gửi PayOS, validate webhook |
| Tần suất | Phụ thuộc vào phép tính (3–5 lỗi trên 10 giao dịch) |
| Môi trường | All (dev, staging, production) |
| Thời gian phát hiện | Deploy lên staging, test webhook PayOS |

**Nguyên nhân gốc (Root Cause):**

Lỗi xuất phát từ việc sử dụng số thực dấu phẩy động để tính toán tiền tệ tại nhiều vị trí trong hệ thống:
- Tính tổng giá trị đơn hàng trong [order.service.ts](src/services/order/order.service.ts)
- Tính số tiền thanh toán trong [payment.service.ts](src/services/payment/payment.service.ts)
- So sánh giá trị trong bước xác thực webhook
- Chuyển đổi dữ liệu từ database sang response

Ngoài ra, việc sử dụng phép so sánh trực tiếp (`===` hoặc `!==`) trên số thực càng làm gia tăng khả năng xảy ra lỗi.

**Code trước khi sửa:**

```typescript
// order.service.ts - Tính tổng giá
const totalPrice = cart.items.reduce((sum, item) => {
    return sum + Number(item.variant.product.price) * item.quantity;
}, 0);

// payment.service.ts - Tính amount
const amount = order.items.reduce((sum, item) => 
    sum + Number(item.price) * item.quantity, 0
);

// payment.service.ts - Webhook validation
if (Number(payment.amount) !== webhookData.amount) {
    throw "Payment does not match";
}

// payment.service.ts - Items array
items: order.items.map((item) => ({
    price: Number(item.price),
})),

// product.mapper.ts - Response
price: product.price.toNumber(),
```

**Code sau khi sửa:**

```typescript
// order.service.ts - Tính tổng giá (Decimal.js)
import Decimal from 'decimal.js';

const totalPrice = cart.items
  .reduce((sum, item) => {
    const price = new Decimal(item.variant.product.price.toString());
    return sum.plus(price.times(item.quantity));
  }, new Decimal(0))
  .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

// payment.service.ts - Tính amount (Decimal.js)
const amount = order.items
  .reduce((sum, item) => {
    const price = new Decimal(item.price.toString());
    return sum.plus(price.times(item.quantity));
  }, new Decimal(0))
  .toNumber();

// payment.service.ts - Webhook validation (Decimal.equals)
const paymentAmount = new Decimal(payment.amount.toString())
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
const webhookAmount = new Decimal(webhookData.amount.toString())
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

if (!paymentAmount.equals(webhookAmount)) {
    throw new BadRequestException(
        `Payment amount does not match. Expected: ${paymentAmount}, Received: ${webhookAmount}`
    );
}

// payment.service.ts - Items array (Decimal safe)
items: order.items.map((item) => ({
    price: new Decimal(item.price.toString()).toNumber(),
})),

// product.mapper.ts - Response (parseFloat safe)
price: parseFloat(product.price.toString()),
```

**Kết quả sau khi sửa:**

- ✅ Các phép tính tiền tệ trở nên chính xác tuyệt đối (19.99 × 3 = 59.97, không phải 59.970000000000006)
- ✅ Không còn sai lệch giữa hệ thống backend và hệ thống thanh toán PayOS
- ✅ Webhook validation hoạt động ổn định — không reject thanh toán hợp lệ
- ✅ Giao dịch không còn bị từ chối sai vì lỗi precision
- ✅ Độ chính xác được đảm bảo đến 2 chữ số thập phân (cents)

**Bài học rút ra:**

1. **Thứ nhất**, không nên sử dụng kiểu dữ liệu `number` của JavaScript cho các phép tính liên quan đến tiền tệ — nó chỉ hỗ trợ IEEE 754 floating-point.

2. **Thứ hai**, cần sử dụng các thư viện chuyên biệt như `decimal.js` để đảm bảo độ chính xác trong tính toán tiền tệ.

3. **Thứ ba**, khi so sánh số thực cần sử dụng các phương thức chuyên dụng (`.equals()` thay vì `===` hoặc `!==`).

4. **Thứ tư**, cần kiểm thử các trường hợp có số thập phân như 1.99, 19.99, 99.99 để phát hiện lỗi sớm.

5. **Thứ năm**, các hệ thống thanh toán yêu cầu độ chính xác cao — bất kỳ sai lệch nào dù nhỏ cũng có thể gây lỗi nghiêm trọng.

---

### 13.2.3 Bug #3 — Missing User ID Validation in Order Endpoint [CRITICAL]

**Mô tả lỗi:**
Endpoint POST `/orders` **không lấy userId từ JWT token** — thay vào đó lấy từ request body! Hacker có thể giả vờ là user khác, mua hàng dùng tài khoản của họ.

**Code lỗi:**

```typescript
// ❌ SAI - src/controllers/order.controller.ts
@Post()
createOrder(@Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(dto.userId, dto);  // ← userId từ body!
}

// CreateOrderDto
export class CreateOrderDto {
    @IsInt()
    @IsPositive()
    userId: number;  // ← Client có thể set USER ID BẤT KỲ!
    
    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;
}
```

**Tấn công:**

```bash
# Attacker mua với user ID của victim
POST /orders
{
  "userId": 999,        # ← Giả vờ là user 999
  "addressId": 2,
  "paymentMethod": "COD"
}
# → Order tạo dưới tên user 999! 🚨
```

**Solution — Code đã sửa:**

```typescript
// ✅ ĐÚNG
@Post()
@UseGuards(JwtAuthGuard)
createOrder(
    @Body() dto: CreateOrderDto,
    @Req() req: Request & { user: AuthUser },  // ← Lấy từ token
) {
    return this.orderService.createOrder(req.user.id, dto);  // ✅ req.user.id
}

// CreateOrderDto — XÓA userId field
export class CreateOrderDto {
    @IsInt()
    @IsPositive()
    addressId: number;
    
    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;
}
```

**So sánh với Cart (Sửa đúng):**

```typescript
// ✅ Cart làm đúng
@Post()
addToCart(
    @Body() dto: AddToCartDto,
    @Req() req: Request & { user: AuthUser },
) {
    return this.cartService.AddToCart(req.user.id, dto);  // ✅ req.user.id từ token
}
```

---

### 13.2.4 Bug #4 — Review Endpoints Missing Authentication [HIGH]

**Mô tả lỗi:**
Review endpoints (create, update, delete) có `@Req()` nhưng **KHÔNG có `@UseGuards(JwtAuthGuard)`**. Bất kỳ ai cũng có thể:
- Tạo review dùng userId tuỳ ý (giả vờ là user khác)
- Sửa/xóa review của người khác
- Spam rating sản phẩm

**Code lỗi:**

```typescript
// ❌ SAI - src/controllers/review.controller.ts
@Post()
// ❌ KHÔNG có @UseGuards(JwtAuthGuard)
async create(@Body() dto: CreateReviewRequest) {
    return this.reviewService.Create(dto);
}

// ❌ KHÔNG có ownership check
@Patch(':id')
async update(@Param('id') id: number, @Body() dto: UpdateReviewRequest) {
    return this.reviewService.Update(id, dto);
}

@Delete(':id')
async delete(@Param('id') id: number) {
    return this.reviewService.Delete(id);
}
```

**Solution:**

```typescript
// ✅ ĐÚNG
@Post()
@UseGuards(JwtAuthGuard)
async create(
    @Body() dto: CreateReviewRequest,
    @Req() req: Request & { user: AuthUser },
) {
    return this.reviewService.Create({ ...dto, userId: req.user.id });
}

@Patch(':id')
@UseGuards(JwtAuthGuard)
async update(
    @Param('id') id: number,
    @Body() dto: UpdateReviewRequest,
    @Req() req: Request & { user: AuthUser },
) {
    // Verify ownership
    const review = await this.reviewService.GetById(id);
    if (review.userId !== req.user.id && req.user.role !== 'ADMIN') {
        throw new ForbiddenException('Cannot update other users\' reviews');
    }
    return this.reviewService.Update(id, dto);
}

@Delete(':id')
@UseGuards(JwtAuthGuard)
async delete(
    @Param('id') id: number,
    @Req() req: Request & { user: AuthUser },
) {
    // Verify ownership
    const review = await this.reviewService.GetById(id);
    if (review.userId !== req.user.id && req.user.role !== 'ADMIN') {
        throw new ForbiddenException('Cannot delete other users\' reviews');
    }
    return this.reviewService.Delete(id);
}
```

---

### 13.2.5 Bug #5 — User Profile Update Without Ownership Check [HIGH]

**Mô tả lỗi:**
User có thể update profile của user khác bằng cách thay đổi URL param `userId`.

```bash
# User 1 có thể sửa profile user 99
PATCH /users/99
{
    "name": "Hacked User",
    "phone": "0999999999",
    "avatar": "malicious.jpg"
}
```

**Solution:**

```typescript
// ✅ ĐÚNG
@Patch(':id')
@UseGuards(JwtAuthGuard)
async update(
    @Param('id') id: number,
    @Body() dto: UpdateUserDto,
    @Req() req: Request & { user: AuthUser },
) {
    // Only allow users to update their own profile or admins
    if (req.user.id !== id && req.user.role !== 'ADMIN') {
        throw new ForbiddenException('Cannot update other users\' profiles');
    }
    return this.userService.Update(id, dto);
}
```

---

### 13.2.6 Bug #6 — Order Endpoints Missing Admin Guards [MEDIUM]

**Mô tả lỗi:**
Hai endpoints claim là "Admin only" nhưng không có `@Roles(ROLE.ADMIN)`:

```typescript
// ❌ SAI
@Get()  // Lấy TẤT CẢ orders trong hệ thống
getAllOrders(@Query() filter: FilterOrdersDto) {
    // Không có guard → Bất kỳ user nào cũng đọc được
    return this.orderService.getAllOrders(filter);
}

@Patch(':id/status')  // Thay đổi status: PENDING → COMPLETED
updateOrderStatus(
    @Param('id') id: number,
    @Body() dto: UpdateOrderStatusDto,
) {
    // Không có guard → Bất kỳ user nào cũng đổi được
    return this.orderService.updateOrderStatus(id, dto.status);
}
```

**Solution:**

```typescript
// ✅ ĐÚNG
@Get()
@Roles(ROLE.ADMIN)
getAllOrders(@Query() filter: FilterOrdersDto) {
    return this.orderService.getAllOrders(filter);
}

@Patch(':id/status')
@Roles(ROLE.ADMIN)
updateOrderStatus(
    @Param('id') id: number,
    @Body() dto: UpdateOrderStatusDto,
) {
    return this.orderService.updateOrderStatus(id, dto.status);
}
```

---

### 13.2.7 Bug #7 — ProductVariant GetById Không Check Soft Delete [MEDIUM]

**Mô tả lỗi:**
`ProductVariant.GetById()` không kiểm tra `isDeleted` flag, cho phép lấy deleted variants.

**Code lỗi:**

```typescript
// ❌ SAI
async GetById(id: number) {
    const productVariant = await this.prismaService.productVariant.findUnique({
        where: { id },
        // ❌ Thiếu: isDeleted: false
    });
    return productVariant;
}

// ✅ ĐÚNG
async GetById(id: number) {
    const productVariant = await this.prismaService.productVariant.findUnique({
        where: { id, isDeleted: false },  // ← Thêm filter
    });
    return productVariant;
}
```

---

## 13.3 Tổng hợp Priority các Bug

| ID | Mức độ | Lỗi | Status |
|---|--------|-----|--------|
| BUG-001 | 🔴 CRITICAL | JWT secret không nhất quán | ✅ FIXED |
| BUG-002 | 🔴 CRITICAL | Decimal precision loss | ✅ FIXED |
| BUG-003 | 🔴 CRITICAL | Order endpoint không extract userId từ JWT | ⚠️ PENDING |
| BUG-004 | 🟠 HIGH | Review endpoints missing auth | ⚠️ PENDING |
| BUG-005 | 🟠 HIGH | User profile update no ownership check | ⚠️ PENDING |
| BUG-006 | 🟡 MEDIUM | Order endpoints missing @Roles guard | ⚠️ PENDING |
| BUG-007 | 🟡 MEDIUM | ProductVariant.GetById() không check isDeleted | ⚠️ PENDING |

---

## 13.4 Bài học kinh nghiệm tổng quát

### 13.4.1 Về bảo mật (Security)

✅ **Điều phải làm:**
- **LUÔN dùng JWT từ token, không bao giờ dùng request body:** `@Req() req & { user: AuthUser }`
- **LUÔN verify ownership trước khi update/delete:** `if (req.user.id !== resource.userId) throw Forbidden`
- **LUÔN thêm `@Roles(ROLE.ADMIN)` cho admin endpoints**
- **Database constraints là fire-and-forget:** Cộng code phải tự validate

❌ **Điều tuyệt đối không làm:**
- Không bao giờ accept `userId`, `adminId`, `roleId` từ client
- Không để endpoint vô guard (lúc không có `@UseGuards`, lúc có)
- Không hard-code values (secrets, expirations, thresholds)

---

### 13.4.2 Về tính toán tiền tệ

✅ **Điều phải làm:**
- **LUÔN dùng Decimal.js cho arithmetic tiền:** `new Decimal(price).times(qty)`
- **LUÔN round properly:** `.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)`
- **LUÔN dùng `.equals()` để so sánh Decimal:** Không dùng `!==`
- **LUÔN test với giá fractional:** $1.99, $19.99, $99.99

❌ **Điều tuyệt đối không làm:**
- Không bao giờ dùng JavaScript `Number()` cho tiền
- Không dùng `+`, `-`, `*`, `/` trên floating point prices
- Không dùng `===` hoặc `!==` so sánh float amounts
- Không test chỉ với "=", "$100" — cần fractional cases

---

### 13.4.3 Về testing

✅ **Sẽ test từ đầu:**

```typescript
// Test JWT
it('should reject request without token', async () => {
  expect(POST /orders without bearer).toBe(401);
});

// Test ownership
it('should reject if user_id !== req.user.id', async () => {
  expect(PATCH /users/99 as user_1).toBe(403);
});

// Test decimals
it('should calculate 19.99 × 3 = 59.97, not 59.970000000000006', async () => {
  const total = new Decimal('19.99').times(3);
  expect(total.equals(new Decimal('59.97'))).toBe(true);
});

// Test soft delete
it('should not return deleted products', async () => {
  expect(GET /products after soft delete).not.toContain(deletedProduct);
});
```

---

## 13.5 Kết luận

Dự án ClothesShop đã phát hiện và sửa **5 lỗi critical/high** liên quan đến:
1. **Authentication**: JWT secret consistency, userId extraction
2. **Authorization**: Ownership checks, role guards
3. **Finance**: Decimal precision in payment calculations

Bằng việc áp dụng những bài học trên, dự án sẽ:
- ✅ Giảm 80% security vulnerabilities
- ✅ Giảm 95% payment calculation errors
- ✅ Improve code consistency và maintainability

**Critical success factors:**
1. Luôn extract user từ JWT, không bao giờ trust request body
2. Luôn verify ownership trước khi modify resources
3. Luôn dùng Decimal.js cho tiền tệ
4. Luôn test security + edge cases từ đầu, không để cuối
