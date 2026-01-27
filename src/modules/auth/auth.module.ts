import { AUTH_SERVICE } from '@common/constant/service.interface.constant';
import { AuthController } from '@controllers/auth.controller';
import { MailModule } from '@modules/mail/mail.module';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { RefreshTokenModule } from '@modules/refresh-token/refresh-token.module';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from '@services/auth/auth.service';
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
  ],
  controllers: [AuthController],
  exports: [AUTH_SERVICE],
})
export class AuthModule {}
