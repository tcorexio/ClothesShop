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
import { Public } from "@common/decorators/public.decorator";
import { PAYMENT_SERVICE } from "@common/constant/service.interface.constant";
import type { IPaymentService } from "@services/payment/payment.service.interface";
import { CreatePaymentLinkDto } from "@dto/payment/create-payment-link.dto";
import { ConfirmPaymentDto } from "@dto/payment/confirm-payment.dto";
import { PayOSWebhookDto } from "@dto/payment/payos-webhook.dto";
import { FilterPaymentsDto } from "@dto/payment/filter-payments.dto";

@Controller("payments")
export class PaymentController {
    constructor(
        @Inject(PAYMENT_SERVICE)
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

    // PayOS calls this without a JWT token
    @Public()
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

    // PayOS redirects here after successful payment
    @Public()
    @Get("success")
    paymentSuccess(@Query() query: Record<string, string>) {
        return {
            message: "Payment successful",
            orderCode: query.orderCode,
            status: query.status,
        };
    }

    // PayOS redirects here when user cancels payment
    @Public()
    @Get("cancel")
    paymentCancel(@Query() query: Record<string, string>) {
        return {
            message: "Payment cancelled",
            orderCode: query.orderCode,
        };
    }
}