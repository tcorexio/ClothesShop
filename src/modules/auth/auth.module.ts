import { AUTH_SERVICE } from '@common/constant/auth.constant';
import { AuthController } from '@controllers/auth.controller';
import { MailModule } from '@modules/mail/mail.module';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from '@services/auth/auth.service';
import { MailService } from '@services/mail/mail.service';
import { PrismaService } from '@services/prisma/prisma.service';

@Module({
  imports: [
    PrismaModule,
    MailModule,
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
  ],
  controllers: [AuthController],
  exports: [AUTH_SERVICE],
})
export class AuthModule {}
