import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@services/prisma/prisma.service";
import { IOrderService } from "./order.service.interface";
import { CreateOrderDto } from "@dto/order/create-order.dto";
import { UpdateOrderStatusDto } from "@dto/order/update-order-status.dto";
import { FilterOrdersDto } from "@dto/order/filter-orders.dto";
import { CancelOrderDto } from "@dto/order/cancel-order.dto";
import { OrderStatus } from "@prisma/client";

@Injectable()
export class OrderService implements IOrderService {
    constructor(private readonly prisma: PrismaService) { }

    async createOrder(userId: number, dto: CreateOrderDto) {
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
                    district: address.district,
                    city: address.city,
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
                    status: 'PENDING',
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
    }
}