import { Test, TestingModule } from '@nestjs/testing';
import { StatisticService } from '@services/statistic/statistic.service';
import { PrismaService } from '@services/prisma/prisma.service';
import { OrderStatus } from 'generated/prisma/enums';

// Stop Jest from loading the real PrismaService (avoids the Prisma ESM + DB connection)
jest.mock('@services/prisma/prisma.service', () => ({
    PrismaService: class MockPrismaService { },
}));

describe('StatisticService', () => {
    let service: StatisticService;
    let prisma: Record<string, jest.Mock>;

    beforeEach(async () => {
        // Provide a mock PrismaService so tests never hit the real database
        prisma = {
            order_findMany: jest.fn(),
            order_groupBy: jest.fn(),
            orderItem_findMany: jest.fn(),
        };

        const mockPrismaService = {
            order: {
                findMany: prisma.order_findMany,
                groupBy: prisma.order_groupBy,
            },
            orderItem: {
                findMany: prisma.orderItem_findMany,
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StatisticService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<StatisticService>(StatisticService);
    });

    // ─── getRevenueStats ──────────────────────────────────────────────────────

    describe('getRevenueStats', () => {
        it('returns correct revenue totals from DELIVERED orders', async () => {
            prisma.order_findMany.mockResolvedValue([
                { totalPrice: '1000' },
                { totalPrice: '2500' },
            ]);

            const result = await service.getRevenueStats({});

            expect(result.totalRevenue).toBe(3500);
            expect(result.totalDeliveredOrders).toBe(2);
            expect(result.averageOrderValue).toBe(1750);
        });

        it('returns zeros when there are no delivered orders', async () => {
            prisma.order_findMany.mockResolvedValue([]);

            const result = await service.getRevenueStats({});

            expect(result.totalRevenue).toBe(0);
            expect(result.totalDeliveredOrders).toBe(0);
            expect(result.averageOrderValue).toBe(0);
        });

        it('queries only DELIVERED orders', async () => {
            prisma.order_findMany.mockResolvedValue([]);

            await service.getRevenueStats({});

            expect(prisma.order_findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ status: OrderStatus.DELIVERED }),
                }),
            );
        });
    });

    // ─── getOrderStats ────────────────────────────────────────────────────────

    describe('getOrderStats', () => {
        it('returns total count and a breakdown by each status', async () => {
            prisma.order_groupBy.mockResolvedValue([
                { status: OrderStatus.PENDING, _count: { id: 3 } },
                { status: OrderStatus.DELIVERED, _count: { id: 7 } },
            ]);

            const result = await service.getOrderStats({});

            expect(result.totalOrders).toBe(10);
            expect(result.countByStatus[OrderStatus.PENDING]).toBe(3);
            expect(result.countByStatus[OrderStatus.DELIVERED]).toBe(7);
        });

        it('returns zero total when no orders exist', async () => {
            prisma.order_groupBy.mockResolvedValue([]);

            const result = await service.getOrderStats({});

            expect(result.totalOrders).toBe(0);
            expect(result.countByStatus).toEqual({});
        });
    });

    // ─── getTopSellingProducts ────────────────────────────────────────────────

    describe('getTopSellingProducts', () => {
        it('returns products sorted by quantity sold, highest first', async () => {
            // Shirt A appears twice — quantities should be aggregated to 8
            prisma.orderItem_findMany.mockResolvedValue([
                { productName: 'Shirt A', quantity: 5, price: '100' },
                { productName: 'Pants B', quantity: 10, price: '200' },
                { productName: 'Shirt A', quantity: 3, price: '100' },
            ]);

            const result = await service.getTopSellingProducts({ limit: 10 });

            expect(result.topProducts[0].productName).toBe('Pants B');
            expect(result.topProducts[0].totalQuantity).toBe(10);
            expect(result.topProducts[1].productName).toBe('Shirt A');
            expect(result.topProducts[1].totalQuantity).toBe(8);
        });

        it('respects the limit parameter', async () => {
            prisma.orderItem_findMany.mockResolvedValue([
                { productName: 'A', quantity: 5, price: '100' },
                { productName: 'B', quantity: 4, price: '100' },
                { productName: 'C', quantity: 3, price: '100' },
            ]);

            const result = await service.getTopSellingProducts({ limit: 2 });

            expect(result.topProducts).toHaveLength(2);
        });

        it('returns an empty list when there are no order items', async () => {
            prisma.orderItem_findMany.mockResolvedValue([]);

            const result = await service.getTopSellingProducts({ limit: 10 });

            expect(result.topProducts).toEqual([]);
        });
    });
});
