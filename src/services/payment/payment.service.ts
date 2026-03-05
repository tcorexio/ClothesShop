import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@services/prisma/prisma.service";
import { IPaymentService } from "./payment.service.interface";
import { CreatePaymentLinkDto } from "@dto/payment/create-payment-link.dto";
import { ConfirmPaymentDto } from "@dto/payment/confirm-payment.dto";
import { PayOSWebhookDto } from "@dto/payment/payos-webhook.dto";
import { FilterPaymentsDto } from "@dto/payment/filter-payments.dto";
import { PaymentStatus, OrderStatus, PaymentMethod } from "generated/prisma/enums";
import { PayOS } from "@payos/node";

@Injectable()
export class PaymentService implements IPaymentService {
    private readonly payos: PayOS;
    private readonly returnUrl: string;
    private readonly cancelUrl: string;

    constructor(private readonly prisma: PrismaService) {
        this.payos = new PayOS({
            clientId: process.env.PAYOS_CLIENT_ID || '',
            apiKey: process.env.PAYOS_API_KEY || '',
            checksumKey: process.env.PAYOS_CHECKSUM_KEY || '',
        });
        this.returnUrl = process.env.PAYOS_RETURN_URL || 'http://localhost:3000/payments/success';
        this.cancelUrl = process.env.PAYOS_CANCEL_URL || 'http://localhost:3000/payments/cancel';
    }

    async getPaymentByOrderId(orderId: number) {
        const payment = await this.prisma.payment.findFirst({
            where: { orderId, isDeleted: false },
            include: {
                order: {
                    include: {
                        user: { select: { id: true, username: true, email: true } },
                    },
                },
            },
        });

        if (!payment) throw new NotFoundException('Payment not found');

        return payment;
    }

    async createPaymentLink(dto: CreatePaymentLinkDto) {
        const order = await this.prisma.order.findFirst({
            where: { id: dto.orderId },
            include: { payment: true, items: true },
        });

        if (!order) throw new NotFoundException("Order not found");
        if (!order.payment) throw new BadRequestException("Payment record not found for this order");
        if (order.payment.method !== PaymentMethod.BANK_TRANSFER) throw new BadRequestException("Only BANK_TRANSFER orders can use PayOS");
        if (order.payment.status !== PaymentStatus.PENDING) throw new BadRequestException("Payment has already been processed");

        try {
            const paymentLink = await this.payos.paymentRequests.create({
                orderCode: order.id,
                amount: Number(order.totalPrice),
                description: `DH${order.id}`,
                returnUrl: this.returnUrl,
                cancelUrl: this.cancelUrl,
                items: order.items.map((item) => ({
                    name: item.productName,
                    quantity: item.quantity,
                    price: Number(item.price),
                })),
            });

            return {
                paymentUrl: paymentLink.checkoutUrl,
                qrCode: paymentLink.qrCode,
                orderId: order.id,
                amount: order.totalPrice,
            };
        } catch (error) {
            throw new BadRequestException(`Failed to create payment link: ${error.message || error}`);
        }
    }

    async handlePayOSWebhook(webhookBody: PayOSWebhookDto) {
        // Verify webhook signature using the PayOS SDK
        let webhookData;
        try {
            webhookData = await this.payos.webhooks.verify(webhookBody);
        } catch (error) {
            throw new BadRequestException(`Invalid webhook signature: ${error.message || error}`);
        }

        // PayOS also sends webhooks for failed/cancelled payments — only process successful ones
        if (webhookBody.code !== "00") {
            return { message: "Webhook received but payment was not successful" };
        }

        const payment = await this.prisma.payment.findFirst({
            where: { orderId: webhookData.orderCode, isDeleted: false },
            include: { order: true },
        });

        if (!payment) throw new NotFoundException("Payment not found");

        if (Number(payment.amount) !== webhookData.amount) {
            throw new BadRequestException("Payment amount does not match");
        }

        // Idempotency check — PayOS may call the webhook more than once
        if (payment.status === PaymentStatus.PAID) {
            return { message: "Payment already processed" };
        }

        await this.prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: PaymentStatus.PAID,
                    transactionId: webhookData.reference,
                    paidAt: new Date(webhookData.transactionDateTime),
                },
            });

            await tx.order.update({
                where: { id: payment.orderId },
                data: { status: OrderStatus.PROCESSED },
            });
        });

        return { message: "Payment processed successfully", orderId: payment.orderId };
    }

    // Manual payment confirmation — used for COD or admin override
    async confirmPayment(dto: ConfirmPaymentDto) {
        const payment = await this.prisma.payment.findFirst({
            where: { id: dto.paymentId, isDeleted: false },
            include: { order: true },
        });

        if (!payment) throw new NotFoundException("Payment not found");
        if (payment.status === PaymentStatus.PAID) throw new BadRequestException("Payment has already been confirmed");

        await this.prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: PaymentStatus.PAID,
                    transactionId: dto.transactionId,
                    paidAt: new Date(),
                },
            });

            if (payment.order.status === OrderStatus.PENDING) {
                await tx.order.update({
                    where: { id: payment.orderId },
                    data: { status: OrderStatus.PROCESSED },
                });
            }
        });

        return this.prisma.payment.findUnique({
            where: { id: payment.id },
            include: { order: true },
        });
    }

    async cancelPayment(paymentId: number) {
        const payment = await this.prisma.payment.findFirst({
            where: { id: paymentId, isDeleted: false },
        });

        if (!payment) throw new NotFoundException("Payment not found");
        if (payment.status === PaymentStatus.PAID) throw new BadRequestException("Cannot cancel a paid payment");

        // For BANK_TRANSFER, cancel the outstanding payment link on PayOS
        if (payment.method === PaymentMethod.BANK_TRANSFER) {
            try {
                await this.payos.paymentRequests.cancel(payment.orderId);
            } catch {
                // Ignore if the payment link no longer exists on PayOS
            }
        }

        return this.prisma.payment.update({
            where: { id: paymentId },
            data: { status: PaymentStatus.FAILED },
        });
    }

    async getPaymentHistory(filter: FilterPaymentsDto) {
        const { status, fromDate, toDate, page = 1, limit = 10 } = filter;
        const skip = (page - 1) * limit;

        const where: any = { isDeleted: false };
        if (status) where.status = status;
        if (fromDate || toDate) {
            where.createdAt = {};
            if (fromDate) where.createdAt.gte = new Date(fromDate);
            if (toDate) where.createdAt.lte = new Date(toDate);
        }

        const [total, payments] = await this.prisma.$transaction([
            this.prisma.payment.count({ where }),
            this.prisma.payment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    order: {
                        include: {
                            user: { select: { id: true, username: true, email: true } },
                        },
                    },
                },
            }),
        ]);

        return {
            data: payments,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async checkPaymentStatus(orderId: number) {
        const payment = await this.prisma.payment.findFirst({
            where: { orderId },
        });

        if (!payment) throw new NotFoundException("Payment not found");

        if (payment.method === PaymentMethod.COD) {
            return {
                orderId,
                status: payment.status,
                message: "COD payment — confirm manually after delivery",
            };
        }

        // Fetch live payment status from PayOS to compare with local DB
        try {
            const payosInfo = await this.payos.paymentRequests.get(orderId);
            return {
                orderId,
                localStatus: payment.status,
                payosStatus: payosInfo.status,
                amount: payosInfo.amount,
                amountPaid: payosInfo.amountPaid,
                transactions: payosInfo.transactions,
            };
        } catch (error) {
            throw new BadRequestException(`Failed to fetch PayOS status: ${error.message}`);
        }
    }
}