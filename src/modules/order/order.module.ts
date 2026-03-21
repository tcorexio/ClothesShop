import { OrderController } from "@controllers/order.controller";
import { PrismaModule } from "@modules/prisma/prisma.module";
import { Module } from "@nestjs/common";
import { OrderService } from "@services/order/order.service";


@Module({
    imports: [PrismaModule],
    controllers: [OrderController],
    providers: [
        {
            provide: "ORDER_SERVICE",
            useClass: OrderService,
        },
    ],
    exports: ["ORDER_SERVICE"],
})
export class OrderModule { }
