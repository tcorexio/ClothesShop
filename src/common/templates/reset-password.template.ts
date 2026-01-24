export const resetPasswordTemplate = (token: string): string => `
<div style="
  max-width: 600px;
  margin: 0 auto;
  font-family: Arial, Helvetica, sans-serif;
  background-color: #f9fafb;
  padding: 32px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="margin: 0; color: #111827;">👗 ClothesShop</h1>
    <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">
      Thời trang dành cho bạn
    </p>
  </div>

  <h2 style="color: #111827; text-align: center;">
    🔐 Đặt lại mật khẩu
  </h2>

  <p style="color: #374151; font-size: 14px;">
    Chúng tôi đã nhận được yêu cầu khôi phục mật khẩu.
    Vui lòng sử dụng mã bên dưới để tiếp tục.
  </p>

  <div style="
    background-color: #111827;
    color: #ffffff;
    padding: 18px;
    border-radius: 8px;
    text-align: center;
    font-size: 18px;
    letter-spacing: 1.5px;
    margin: 28px 0;
    font-weight: bold;
  ">
    ${token}
  </div>

  <p style="color: #374151; font-size: 14px;">
    ⏰ Mã này có hiệu lực trong <strong>10 phút</strong>.
    Vui lòng không chia sẻ mã này cho bất kỳ ai.
  </p>

  <hr style="border-top: 1px solid #e5e7eb; margin: 32px 0;" />

  <p style="color: #6b7280; font-size: 12px; text-align: center;">
    © 2026 ClothesShop. All rights reserved.
  </p>
</div>
`;
