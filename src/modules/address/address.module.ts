import { Module } from '@nestjs/common';
import { ADDRESS_SERVICE } from '@common/constant/service.interface.constant';
import { AddressController } from '@controllers/address.controller';
import { AdressService } from '@services/adress/adress.service';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { UserModule } from '@modules/user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [AddressController],
  providers: [
    {
      provide: ADDRESS_SERVICE,
      useClass: AdressService,
    },
  ],
  exports: [ADDRESS_SERVICE],
})
export class AddressModule {}
