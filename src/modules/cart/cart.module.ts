import { Module } from '@nestjs/common';
import { CART_SERVICE } from '@common/constant/service.interface.constant';
import { CartController } from '@controllers/cart.controller';
import { CartService } from '@services/cart/cart.service';
import { PrismaModule } from '@modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CartController],
  providers: [
    {
      provide: CART_SERVICE,
      useClass: CartService,
    },
  ],
  exports: [CART_SERVICE],
})
export class CartModule {}