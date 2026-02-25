import { USER_SERVICE } from '@common/constant/service.interface.constant';
import { UserController } from '@controllers/user.controller';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { UserService } from '@services/user/user.service';

@Module({
  imports: [PrismaModule],
  providers: [{ provide: USER_SERVICE, useClass: UserService }],
  controllers: [UserController],
  exports: [USER_SERVICE],
})
export class UserModule {}
