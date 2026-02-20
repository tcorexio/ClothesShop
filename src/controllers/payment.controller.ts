import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    Inject,
    ParseIntPipe,
} from "@nestjs/common";
import type { IPaymentService } from "@services/payment/payment.service.interface";
import { CreatePaymentLinkDto } from "@dto/payment/create-payment-link.dto";
import { ConfirmPaymentDto } from "@dto/payment/confirm-payment.dto";
import { PayOSWebhookDto } from "@dto/payment/payos-webhook.dto";
import { FilterPaymentsDto } from "@dto/payment/filter-payments.dto";

@Controller("payments")
export class PaymentController {
    constructor(
        @Inject("PAYMENT_SERVICE")
        private readonly paymentService: IPaymentService,
    ) { }

    @Get("order/:orderId")
    getPaymentByOrderId(@Param("orderId", ParseIntPipe) orderId: number) {
        return this.paymentService.getPaymentByOrderId(orderId);
    }

    @Post("create-link")
    createPaymentLink(@Body() dto: CreatePaymentLinkDto) {
        return this.paymentService.createPaymentLink(dto);
    }

    @Post("webhook")
    handlePayOSWebhook(@Body() dto: PayOSWebhookDto) {
        return this.paymentService.handlePayOSWebhook(dto);
    }

    @Patch("confirm")
    confirmPayment(@Body() dto: ConfirmPaymentDto) {
        return this.paymentService.confirmPayment(dto);
    }

    @Patch(":id/cancel")
    cancelPayment(@Param("id", ParseIntPipe) id: number) {
        return this.paymentService.cancelPayment(id);
    }

    @Get("history")
    getPaymentHistory(@Query() filter: FilterPaymentsDto) {
        return this.paymentService.getPaymentHistory(filter);
    }

    @Get("check-status/:orderId")
    checkPaymentStatus(@Param("orderId", ParseIntPipe) orderId: number) {
        return this.paymentService.checkPaymentStatus(orderId);
    }
}