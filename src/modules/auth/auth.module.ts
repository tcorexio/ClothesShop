import { AUTH_SERVICE } from '@common/constant/auth.constant';
import { AuthController } from '@controllers/auth.controller';
import { MailModule } from '@modules/mail/mail.module';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { RefreshTokenModule } from '@modules/refresh-token/refresh-token.module';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from '@services/auth/auth.service';
import { MailService } from '@services/mail/mail.service';
import { PrismaService } from '@services/prisma/prisma.service';
import { JwtStrategy } from 'src/strategies/jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    UserModule,
    RefreshTokenModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [
    {
      provide: AUTH_SERVICE,
      useClass: AuthService,
    },
    JwtStrategy,
    ConfigService,
  ],
  controllers: [AuthController],
  exports: [AUTH_SERVICE, ConfigService],
})
export class AuthModule {}
