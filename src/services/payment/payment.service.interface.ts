import { CreatePaymentLinkDto } from '@dto/payment/create-payment-link.dto';
import { ConfirmPaymentDto } from '@dto/payment/confirm-payment.dto';
import { PayOSWebhookDto } from '@dto/payment/payos-webhook.dto';
import { FilterPaymentsDto } from '@dto/payment/filter-payments.dto';

export interface IPaymentService {
    // Returns the payment record associated with the given order
    getPaymentByOrderId(orderId: number): Promise<any>;

    // Creates a PayOS payment link for a BANK_TRANSFER order
    createPaymentLink(dto: CreatePaymentLinkDto): Promise<any>;

    // Handles the webhook callback from PayOS after a transaction completes
    handlePayOSWebhook(dto: PayOSWebhookDto): Promise<any>;

    // Manually marks a payment as PAID — used for COD or admin confirmation
    confirmPayment(dto: ConfirmPaymentDto): Promise<any>;

    // Cancels a pending payment and invalidates the PayOS link if applicable
    cancelPayment(paymentId: number): Promise<any>;

    // Returns a paginated list of payments with optional filters
    getPaymentHistory(filter: FilterPaymentsDto): Promise<any>;

    // Checks payment status in local DB and cross-references with PayOS
    checkPaymentStatus(orderId: number): Promise<any>;
}
