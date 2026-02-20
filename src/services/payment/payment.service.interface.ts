import { CreatePaymentLinkDto } from '@dto/payment/create-payment-link.dto';
import { ConfirmPaymentDto } from '@dto/payment/confirm-payment.dto';
import { PayOSWebhookDto } from '@dto/payment/payos-webhook.dto';
import { FilterPaymentsDto } from '@dto/payment/filter-payments.dto';

export interface IPaymentService {
    getPaymentByOrderId(orderId: number): Promise<any>;

    createPaymentLink(dto: CreatePaymentLinkDto): Promise<any>;

    handlePayOSWebhook(dto: PayOSWebhookDto): Promise<any>;

    confirmPayment(dto: ConfirmPaymentDto): Promise<any>;

    cancelPayment(paymentId: number): Promise<any>;

    getPaymentHistory(filter: FilterPaymentsDto): Promise<any>;

    checkPaymentStatus(orderId: number): Promise<any>;
}
