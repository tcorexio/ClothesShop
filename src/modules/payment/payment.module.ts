import { Module } from "@nestjs/common";
import { PaymentController } from "@controllers/payment.controller.js";
import { PaymentService } from "@services/payment/payment.service.js";
import { PrismaModule } from "@modules/prisma/prisma.module.js";
import { PAYMENT_SERVICE } from "@common/constant/service.interface.constant";

@Module({
    imports: [PrismaModule],
    controllers: [PaymentController],
    providers: [
        {
            provide: PAYMENT_SERVICE,
            useClass: PaymentService,
        },
    ],
    exports: [PAYMENT_SERVICE],
})
export class PaymentModule { }
