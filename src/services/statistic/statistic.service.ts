import { Injectable } from '@nestjs/common';
import { PrismaService } from '@services/prisma/prisma.service';
import { IStatisticService } from './statistic.service.interface';
import { StatisticFilterDto } from '@dto/statistic/statistic-filter.dto';
import { OrderStatus } from 'generated/prisma/enums';

@Injectable()
export class StatisticService implements IStatisticService {
    constructor(private readonly prisma: PrismaService) { }

    // Only count revenue from DELIVERED orders — pending or cancelled orders are excluded
    async getRevenueStats(filter: StatisticFilterDto) {
        const where = this.buildDateFilter(filter);
        where.status = OrderStatus.DELIVERED;

        const orders = await this.prisma.order.findMany({
            where,
            select: { totalPrice: true },
        });

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalPrice), 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        return {
            totalRevenue: Math.round(totalRevenue),
            totalDeliveredOrders: totalOrders,
            averageOrderValue: Math.round(averageOrderValue),
        };
    }

    async getOrderStats(filter: StatisticFilterDto) {
        const where = this.buildDateFilter(filter);

        const groupResult = await this.prisma.order.groupBy({
            by: ['status'],
            where,
            _count: { id: true },
        });

        // Transform groupBy result into a plain object: { PENDING: 5, DELIVERED: 12, ... }
        const countByStatus: Record<string, number> = {};
        let totalOrders = 0;

        for (const row of groupResult) {
            countByStatus[row.status] = row._count.id;
            totalOrders += row._count.id;
        }

        return { totalOrders, countByStatus };
    }

    async getTopSellingProducts(filter: StatisticFilterDto) {
        const { limit = 10 } = filter;
        const where = this.buildDateFilter(filter);

        // Get OrderItems only from DELIVERED orders, then aggregate and sort by quantity sold
        const orderItems = await this.prisma.orderItem.findMany({
            where: {
                order: { ...where, status: OrderStatus.DELIVERED },
            },
            select: { productName: true, quantity: true, price: true },
        });

        const productMap = new Map<string, { totalQuantity: number; totalRevenue: number }>();

        for (const item of orderItems) {
            const existing = productMap.get(item.productName) ?? { totalQuantity: 0, totalRevenue: 0 };
            productMap.set(item.productName, {
                totalQuantity: existing.totalQuantity + item.quantity,
                totalRevenue: existing.totalRevenue + Number(item.price) * item.quantity,
            });
        }

        const topProducts = Array.from(productMap.entries())
            .map(([productName, stats]) => ({
                productName,
                totalQuantity: stats.totalQuantity,
                totalRevenue: Math.round(stats.totalRevenue),
            }))
            .sort((a, b) => b.totalQuantity - a.totalQuantity)
            .slice(0, limit);

        return { topProducts };
    }

    // Build a date range filter for createdAt, shared across all 3 methods
    private buildDateFilter(filter: StatisticFilterDto) {
        const where: any = { isDeleted: false };

        if (filter.fromDate || filter.toDate) {
            where.createdAt = {};
            if (filter.fromDate) where.createdAt.gte = new Date(filter.fromDate);
            if (filter.toDate) where.createdAt.lte = new Date(filter.toDate);
        }

        return where;
    }
}
