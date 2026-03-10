import { CreatePaymentLinkDto } from '@dto/payment/create-payment-link.dto';
import { ConfirmPaymentDto } from '@dto/payment/confirm-payment.dto';
import { PayOSWebhookDto } from '@dto/payment/payos-webhook.dto';
import { FilterPaymentsDto } from '@dto/payment/filter-payments.dto';
import { PaymentStatus, PaymentMethod } from 'generated/prisma/enums';

// Shape of a payment record returned from the database
export interface PaymentRecord {
    id: number;
    orderId: number;
    method: PaymentMethod;
    status: PaymentStatus;
    amount: unknown; // Prisma Decimal
    transactionId: string | null;
    paidAt: Date | null;
    createdAt: Date;
    isDeleted: boolean;
}

// Paginated result for payment history
export interface PaymentHistoryResult {
    data: PaymentRecord[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// Cross-checked status — two shapes depending on payment method (COD vs BANK_TRANSFER)
export type PaymentStatusResult =
    | { orderId: number; status: PaymentStatus; message: string }
    | {
        orderId: number;
        localStatus: PaymentStatus;
        payosStatus: string;
        amount: number;
        amountPaid: number;
        transactions: unknown[];
        synced: boolean;
      };

export interface IPaymentService {
    // Returns the payment record associated with the given order
    getPaymentByOrderId(orderId: number): Promise<PaymentRecord>;

    // Creates a PayOS payment link for a BANK_TRANSFER order
    createPaymentLink(dto: CreatePaymentLinkDto): Promise<{ checkoutUrl: string | null; orderId: number }>;

    // Handles the webhook callback from PayOS after a transaction completes
    handlePayOSWebhook(dto: PayOSWebhookDto): Promise<{ message: string; orderId?: number }>;

    // Manually marks a payment as PAID — used for COD or admin confirmation
    confirmPayment(dto: ConfirmPaymentDto): Promise<PaymentRecord | null>;

    // Cancels a pending payment and invalidates the PayOS link if applicable
    cancelPayment(paymentId: number): Promise<PaymentRecord>;

    // Returns a paginated list of payments with optional filters
    getPaymentHistory(filter: FilterPaymentsDto): Promise<PaymentHistoryResult>;

    // Checks payment status in local DB and cross-references with PayOS
    checkPaymentStatus(orderId: number): Promise<PaymentStatusResult>;
}
