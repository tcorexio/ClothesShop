import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@services/prisma/prisma.service";
import { IOrderService } from "./order.service.interface";
import { CreateOrderDto } from "@dto/order/create-order.dto";
import { UpdateOrderStatusDto } from "@dto/order/update-order-status.dto";
import { FilterOrdersDto } from "@dto/order/filter-orders.dto";
import { CancelOrderDto } from "@dto/order/cancel-order.dto";
import { OrderStatus, PaymentStatus } from "generated/prisma/enums";

@Injectable()
export class OrderService implements IOrderService {
    constructor(private readonly prisma: PrismaService) { }

    // CREATE ORDER
    async createOrder(userId: number, dto: CreateOrderDto) {
        try {
            const cart = await this.prisma.cart.findUnique({
                where: { userId },
                include: {
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

            if (!cart || cart.items.length === 0) {
                throw new BadRequestException('Cart is empty');
            }

            for (const item of cart.items) {
                if (item.variant.stock < item.quantity) {
                    throw new BadRequestException(
                        `Insufficient stock for ${item.variant.product.name} ` +
                        `(${item.variant.color} - ${item.variant.size}). ` +
                        `Available: ${item.variant.stock}, Requested: ${item.quantity}`
                    );
                }
            }

            const address = await this.prisma.address.findFirst({
                where: {
                    id: dto.addressId,
                    userId,
                },
            });

            if (!address) {
                throw new NotFoundException('Address not found or does not belong to you');
            }

            const user = await this.prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                throw new NotFoundException('User not found');
            }

            const totalPrice = cart.items.reduce((sum, item) => {
                return sum + Number(item.variant.product.price) * item.quantity;
            }, 0);

            const order = await this.prisma.$transaction(async (tx) => {
                const orderAddress = await tx.orderAddress.create({
                    data: {
                        fullName: user.name || 'N/A',
                        phone: address.phone,
                        street: address.street,
                        city: address.city,
                        district: null,
                    },
                });

                const newOrder = await tx.order.create({
                    data: {
                        userId,
                        orderAddressId: orderAddress.id,
                        totalPrice,
                        status: OrderStatus.PENDING,
                    },
                });

                for (const item of cart.items) {
                    await tx.orderItem.create({
                        data: {
                            orderId: newOrder.id,
                            variantId: item.variantId,
                            quantity: item.quantity,
                            productName: item.variant.product.name,
                            variantSize: item.variant.size,
                            variantColor: item.variant.color,
                            price: item.variant.product.price,
                            variantImageUrl: item.variant.imageUrl,
                        },
                    });

                    await tx.productVariant.update({
                        where: { id: item.variantId },
                        data: {
                            stock: {
                                decrement: item.quantity,
                            },
                        },
                    });
                }

                await tx.cartItem.deleteMany({
                    where: { cartId: cart.id },
                });

                await tx.payment.create({
                    data: {
                        orderId: newOrder.id,
                        method: dto.paymentMethod,
                        status: PaymentStatus.PENDING,
                        amount: totalPrice,
                    },
                });

                return newOrder;
            });

            return this.prisma.order.findUnique({
                where: { id: order.id },
                include: {
                    items: true,
                    orderAddress: true,
                    payment: true,
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            name: true,
                        },
                    },
                },
            });
        } catch (error) {
            console.error('Create order error:', error);
            throw new BadRequestException(`Failed to create order: ${error.message || error}`);
        }
    }

    // GET USER ORDERS
    async getUserOrders(userId: number, filter: FilterOrdersDto) {
        const { status, fromDate, toDate, page = 1, limit = 10 } = filter;

        const where: any = {
            userId,
            isDeleted: false,
        };

        if (status) {
            where.status = status;
        }

        if (fromDate || toDate) {
            where.createdAt = {};
            if (fromDate) where.createdAt.gte = new Date(fromDate);
            if (toDate) where.createdAt.lte = new Date(toDate);
        }

        const total = await this.prisma.order.count({ where });

        const orders = await this.prisma.order.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                items: true,
                orderAddress: true,
                payment: true,
            },
        });

        return {
            data: orders,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // GET ORDER BY ID
    async getOrderById(orderId: number, userId: number) {
        const order = await this.prisma.order.findFirst({
            where: {
                id: orderId,
                userId,
                isDeleted: false,
            },
            include: {
                items: true,
                orderAddress: true,
                payment: true,
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException("Order not found");
        }

        return order;
    }

    // UPDATE ORDER STATUS (Admin)
    async updateOrderStatus(orderId: number, dto: UpdateOrderStatusDto) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, isDeleted: false },
        });

        if (!order) {
            throw new NotFoundException("Order not found");
        }

        // Validate status transitions
        const validTransitions: Record<string, string[]> = {
            [OrderStatus.PENDING]: [OrderStatus.PROCESSED, OrderStatus.CANCELLED],
            [OrderStatus.PROCESSED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
            [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
            [OrderStatus.DELIVERED]: [],
            [OrderStatus.CANCELLED]: [],
        };

        const allowedStatuses = validTransitions[order.status] || [];
        if (!allowedStatuses.includes(dto.status)) {
            throw new BadRequestException(
                `Cannot change status from ${order.status} to ${dto.status}`
            );
        }

        return this.prisma.order.update({
            where: { id: orderId },
            data: { status: dto.status },
            include: {
                items: true,
                orderAddress: true,
                payment: true,
            },
        });
    }

    // CANCEL ORDER
    async cancelOrder(orderId: number, userId: number, dto: CancelOrderDto) {
        const order = await this.prisma.order.findFirst({
            where: {
                id: orderId,
                userId,
                isDeleted: false,
            },
            include: {
                items: true,
                payment: true,
            },
        });

        if (!order) {
            throw new NotFoundException("Order not found");
        }

        // Only allow cancellation when PENDING
        if (order.status !== OrderStatus.PENDING) {
            throw new BadRequestException(
                `Cannot cancel order with status ${order.status}. Only PENDING orders can be cancelled.`
            );
        }

        await this.prisma.$transaction(async (tx) => {
            // Update order status
            await tx.order.update({
                where: { id: orderId },
                data: { status: OrderStatus.CANCELLED },
            });

            // Refund stock for each variant
            for (const item of order.items) {
                if (item.variantId) {
                    await tx.productVariant.update({
                        where: { id: item.variantId },
                        data: {
                            stock: {
                                increment: item.quantity,
                            },
                        },
                    });
                }
            }

            // Update payment status
            if (order.payment) {
                await tx.payment.update({
                    where: { id: order.payment.id },
                    data: { status: PaymentStatus.FAILED },
                });
            }
        });

        return this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: true,
                orderAddress: true,
                payment: true,
            },
        });
    }

    // GET ALL ORDERS (Admin)
    async getAllOrders(filter: FilterOrdersDto) {
        const { status, fromDate, toDate, page = 1, limit = 10 } = filter;

        const where: any = {
            isDeleted: false,
        };

        if (status) {
            where.status = status;
        }

        if (fromDate || toDate) {
            where.createdAt = {};
            if (fromDate) where.createdAt.gte = new Date(fromDate);
            if (toDate) where.createdAt.lte = new Date(toDate);
        }

        const total = await this.prisma.order.count({ where });

        const orders = await this.prisma.order.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                items: true,
                orderAddress: true,
                payment: true,
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });

        return {
            data: orders,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}