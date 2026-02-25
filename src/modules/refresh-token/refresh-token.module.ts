import { REFRESHTOKEN_SERVICE } from '@common/constant/service.interface.constant';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { RefreshTokenService } from '@services/refresh-token/refresh-token.service';

@Module({
  imports: [PrismaModule],
  providers: [{ provide: REFRESHTOKEN_SERVICE, useClass: RefreshTokenService }],
  exports: [REFRESHTOKEN_SERVICE],
})
export class RefreshTokenModule {}
