import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from '@modules/prisma/prisma.module.js';
import { AuthModule } from '@modules/auth/auth.module.js';
import { MailModule } from '@modules/mail/mail.module.js';
import { PaymentModule } from '@modules/payment/payment.module.js';
import { OrderModule } from '@modules/order/order.module.js';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule, AuthModule, MailModule, PaymentModule, OrderModule, JwtModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
