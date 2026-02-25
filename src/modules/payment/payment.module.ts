import { Module } from "@nestjs/common";
import { PaymentController } from "@controllers/payment.controller.js";
import { PaymentService } from "@services/payment/payment.service.js";
import { PrismaModule } from "@modules/prisma/prisma.module.js";
@Module({
    imports: [PrismaModule],
    controllers: [PaymentController],
    providers: [
        {
            provide: "PAYMENT_SERVICE",
            useClass: PaymentService,
        },
    ],
    exports: ["PAYMENT_SERVICE"],
})
export class PaymentModule { }