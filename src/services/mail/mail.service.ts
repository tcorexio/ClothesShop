import { resetPasswordTemplate } from '@common/templates/reset-password.template';
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
    try {
      await this.transporter.sendMail({
        to: email,
        subject: 'Yêu cầu đặt lại mật khẩu',
        html: resetPasswordTemplate(token),
      });
    } catch (error) {
      console.error('Send mail error:', error);
      throw new Error('Không thể gửi email khôi phục mật khẩu');
    }
  }
}
