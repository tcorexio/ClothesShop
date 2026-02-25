import { Module } from "@nestjs/common";
import { OrderController } from "@controllers/order.controller.js";
import { OrderService } from "@services/order/order.service.js";
import { PrismaModule } from "@modules/prisma/prisma.module.js";

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
