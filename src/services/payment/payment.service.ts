import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@services/prisma/prisma.service";
import { IPaymentService } from "./payment.service.interface";
import { CreatePaymentLinkDto } from "@dto/payment/create-payment-link.dto";
import { ConfirmPaymentDto } from "@dto/payment/confirm-payment.dto";
import { PayOSWebhookDto } from "@dto/payment/payos-webhook.dto";
import { FilterPaymentsDto } from "@dto/payment/filter-payments.dto";
import { PaymentStatus, OrderStatus } from "@prisma/client";

@Injectable()
export class PaymentService implements IPaymentService {
    private readonly PAYOS_CLIENT_ID: string;
    private readonly PAYOS_API_KEY: string;
    private readonly PAYOS_CHECKSUM_KEY: string;
    private readonly PAYOS_RETURN_URL: string;
    private readonly PAYOS_CANCEL_URL: string;

    constructor(private readonly prisma: PrismaService) {
        this.PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID || '';
        this.PAYOS_API_KEY = process.env.PAYOS_API_KEY || '';
        this.PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY || '';
        this.PAYOS_RETURN_URL = process.env.PAYOS_RETURN_URL || 'http://localhost:3000/payment/success';
        this.PAYOS_CANCEL_URL = process.env.PAYOS_CANCEL_URL || 'http://localhost:3000/payment/cancel';
    }

    async getPaymentByOrderId(orderId: number) {
        const payment = await this.prisma.payment.findFirst({
            where: {
                orderId,
                isDeleted: false,
            },
            include: {
                order: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        return payment;
    }

    async createPaymentLink(dto: CreatePaymentLinkDto) {
        const order = await this.prisma.order.findFirst({
            where: { id: dto.orderId },
            include: {
                payment: true,
                items: {
                    include: {
                        variant: {
                            include: {
                                product: true,
                            },
                        },
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException("Order not found");
        }

        if (!order.payment) {
            throw new BadRequestException("Payment not found for this order");
        }

        if (order.payment.method !== "BANK_TRANSFER") {
            throw new BadRequestException("Payment method must be BANK_TRANSFER");
        }

        if (order.payment.status !== PaymentStatus.PENDING) {
            throw new BadRequestException("Payment has already been processed");
        }

        const paymentData = {
            orderCode: order.id,
            amount: Number(order.totalPrice),
            description: "Payment for order " + order.id,
            returnURL: this.PAYOS_RETURN_URL,
            cancelURL: this.PAYOS_CANCEL_URL,
        }

        try {
            const response = await fetch("https://api-merchant.payos.vn/v2/payment-requests", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-client-id": this.PAYOS_CLIENT_ID,
                    "x-api-key": this.PAYOS_API_KEY,
                },
                body: JSON.stringify(paymentData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new BadRequestException(`PayOS API error: ${error.message || 'Unknown error'}`);
            }

            const result = await response.json();

            return {
                paymentUrl: result.data.checkoutUrl,
                qrCode: result.data.qrCode,
                orderId: order.id,
                amount: order.totalPrice,
            };
        } catch (error) {
            throw new BadRequestException(`Failed to create payment link: ${error.message}`);
        }
    }

    async handlePayOSWebhook(dto: PayOSWebhookDto) {
        if (dto.code !== "00") {
            throw new BadRequestException("Payment failed");
        }

        const payment = await this.prisma.payment.findFirst({
            where: {
                orderId: dto.orderCode,
                isDeleted: false,
            },
            include: {
                order: true,
            },
        });

        if (!payment) {
            throw new NotFoundException("Payment not found");
        }

        if (Number(payment.amount) !== dto.amount) {
            throw new BadRequestException("Payment amount mismatch");
        }

        if (payment.status == PaymentStatus.PAID) {
            return { message: "Payment already processed" }
        }

        await this.prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: PaymentStatus.PAID,
                    transactionId: dto.reference,
                    paidAt: new Date(dto.transactionDateTime),
                },
            });

            await tx.order.update({
                where: { id: payment.orderId },
                data: {
                    status: OrderStatus.PROCESSED,
                },
            });
        });

        return {
            message: "Payment processed successfully",
            orderId: payment.orderId,
        };
    }

    async confirmPayment(dto: ConfirmPaymentDto) {
        const payment = await this.prisma.payment.findUnique({
            where: {
                id: dto.paymentId
            },
            include: {
                order: true
            },
        });

        if (!payment) {
            throw new NotFoundException("Payment not found");
        }

        if (payment.status == PaymentStatus.PAID) {
            throw new BadRequestException("Payment has already been confirmed");
        }

        await this.prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: PaymentStatus.PAID,
                    transactionId: dto.transactionId,
                    paidAt: new Date(),
                },
            });

            if (payment.order.status == OrderStatus.PENDING) {
                await tx.order.update({
                    where: { id: payment.orderId },
                    data: {
                        status: OrderStatus.PROCESSED,
                    },
                });
            }
        });

        return this.prisma.payment.findUnique({
            where: { id: payment.id },
            include: {
                order: true,
            },
        });
    }

    async cancelPayment(paymentId: number) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
        });

        if (!payment) {
            throw new NotFoundException("Payment not found");
        }

        if (payment.status == PaymentStatus.PAID) {
            throw new BadRequestException("Cannot cancel paid payment")
        }

        return this.prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: PaymentStatus.FAILED,
            },
        });
    }

    async getPaymentHistory(filter: FilterPaymentsDto) {
        const { status, fromDate, toDate, page = 1, limit = 10 } = filter;

        const where: any = {
            isDeleted: false,
        };

        if (status) {
            where.status = status;
        }

        if (fromDate || toDate) {
            where.createdAt = {};

            if (fromDate) {
                where.createdAt.gte = new Date(fromDate);
            }

            if (toDate) {
                where.createdAt.lte = new Date(toDate);
            }
        }

        const total = await this.prisma.payment.count({ where });

        const payments = await this.prisma.payment.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                order: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });

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

        if (!payment) {
            throw new NotFoundException("Payment not found");
        }

        if (payment.method == "COD") {
            return {
                orderId,
                status: payment.status,
                message: "COD payment, manual confirmation required",
            };
        }

        try {
            const response = await fetch(
                `https://api-merchant.payos.vn/v2/payment-requests/${orderId}`,
                {
                    method: "GET",
                    headers: {
                        'x-client-id': this.PAYOS_CLIENT_ID,
                        'x-api-key': this.PAYOS_API_KEY,
                    },
                }
            );

            if (!response.ok) {
                throw new BadRequestException("Failed to check payment status from PayOS");
            }

            const result = await response.json();

            return {
                orderId,
                localStatus: payment.status,
                payosStatus: result.data.status,
                amount: result.data.amount,
                transactionDateTime: result.data.transactionDateTime,
            };
        } catch (error) {
            throw new BadRequestException(`Failed to check payment status: ${error.message}`);
        }
    }
}