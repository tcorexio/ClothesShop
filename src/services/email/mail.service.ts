import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  async sendResetPasswordMail(email: string, token: string) {
    // const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    await this.transporter.sendMail({
      to: email,
      subject: 'Yêu cầu đặt lại mật khẩu',
      html: `
  <div style="
    max-width: 600px;
    margin: auto;
    font-family: Arial, Helvetica, sans-serif;
    background-color: #f9fafb;
    padding: 24px;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  ">
    <h2 style="color: #111827; text-align: center;">
      🔐 Đặt lại mật khẩu
    </h2>

    <p style="color: #374151; font-size: 14px;">
      Xin chào,
    </p>

    <p style="color: #374151; font-size: 14px;">
      Bạn đã gửi yêu cầu <strong>khôi phục mật khẩu</strong>.
      Vui lòng sử dụng mã token bên dưới để đặt lại mật khẩu.
    </p>

    <div style="
      background-color: #111827;
      color: #ffffff;
      padding: 16px;
      border-radius: 6px;
      text-align: center;
      font-size: 16px;
      letter-spacing: 1px;
      margin: 24px 0;
      word-break: break-all;
    ">
      ${token}
    </div>

    <p style="color: #374151; font-size: 14px;">
      ⏰ Token này có hiệu lực trong <strong>10 phút</strong>.
      Vui lòng không chia sẻ token này cho bất kỳ ai.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

    <p style="color: #6b7280; font-size: 12px; text-align: center;">
      Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
    </p>

    <p style="color: #6b7280; font-size: 12px; text-align: center;">
      © 2026 Your Backend System
    </p>
  </div>
  `,
    });
  }
}
