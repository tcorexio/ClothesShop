import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtModule } from '@nestjs/jwt';
import { RefreshTokenModule } from './modules/refresh-token/refresh-token.module';
import { UserModule } from './modules/user/user.module';
import { AddressModule } from './modules/address/address.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { S3Module } from './modules/s3/s3.module';
import { CartModule } from '@modules/cart/cart.module';
import { CategoryModule } from '@modules/category/category.module';
import { ProductModule } from '@modules/product/product.module';
import { ProductVariantModule } from '@modules/product-variant/product-variant.module';
import { StatisticModule } from './modules/statistic/statistic.module';
import { ReviewModule } from '@modules/review/review.module';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { MailModule } from '@modules/mail/mail.module';
import { OrderModule } from '@modules/order/order.module';
import { PaymentModule } from '@modules/payment/payment.module';


@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MailModule,
    JwtModule,
    RefreshTokenModule,
    UserModule,
    AddressModule,
    CartModule,
    StatisticModule,
    S3Module,
    CategoryModule,
    ProductModule,
    ProductVariantModule,
    OrderModule,
    PaymentModule,
    ReviewModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule { }
