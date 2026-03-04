import { PaymentController } from "@controllers/payment.controller";
import { PrismaModule } from "@modules/prisma/prisma.module";
import { Module } from "@nestjs/common";
import { PaymentService } from "@services/payment/payment.service";

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