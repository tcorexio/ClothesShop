import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from '@modules/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { MailModule } from '@modules/mail/mail.module';
import { JwtModule } from '@nestjs/jwt';
import { RefreshTokenModule } from './modules/refresh-token/refresh-token.module';
import { UserModule } from './modules/user/user.module';
import { AddressModule } from './modules/address/address.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { S3Service } from './services/s3/s3.service';
import { S3Module } from './modules/s3/s3.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MailModule,
    JwtModule,
    RefreshTokenModule,
    UserModule,
    AddressModule,
    S3Module,
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
export class AppModule {}
