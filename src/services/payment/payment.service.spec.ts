import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PrismaService } from '@services/prisma/prisma.service';
import { PaymentStatus, PaymentMethod, OrderStatus } from 'generated/prisma/enums';

// Stop Jest from loading the real PrismaService (avoids the Prisma ESM + DB connection)
jest.mock('@services/prisma/prisma.service', () => ({
    PrismaService: class MockPrismaService {},
}));

// Prevent the PayOS SDK from throwing when env vars are missing in test environment
jest.mock('@payos/node', () => ({
    PayOS: jest.fn().mockImplementation(() => ({
        paymentRequests: {
            create: jest.fn(),
            get: jest.fn(),
            cancel: jest.fn(),
        },
        webhooks: { verify: jest.fn() },
    })),
}));

// Helper: build a minimal mock payment object
function mockPayment(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        orderId: 1,
        method: PaymentMethod.COD,
        status: PaymentStatus.PENDING,
        amount: '500',
        transactionId: null,
        paidAt: null,
        createdAt: new Date(),
        isDeleted: false,
        order: { id: 1, status: OrderStatus.PENDING },
        ...overrides,
    };
}

describe('PaymentService', () => {
    let service: PaymentService;
    let prisma: Record<string, jest.Mock>;

    beforeEach(async () => {
        // Provide a mock PrismaService so tests never hit the real database
        prisma = {
            payment_findFirst: jest.fn(),
            payment_findUnique: jest.fn(),
            payment_update: jest.fn(),
            payment_count: jest.fn(),
            payment_findMany: jest.fn(),
            order_update: jest.fn(),
            $transaction: jest.fn(),
        };

        const mockPrismaService = {
            payment: {
                findFirst: prisma.payment_findFirst,
                findUnique: prisma.payment_findUnique,
                update: prisma.payment_update,
                count: prisma.payment_count,
                findMany: prisma.payment_findMany,
            },
            order: {
                update: prisma.order_update,
            },
            $transaction: prisma.$transaction,
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<PaymentService>(PaymentService);
    });

    // ─── getPaymentByOrderId ──────────────────────────────────────────────────

    describe('getPaymentByOrderId', () => {
        it('returns the payment when it exists', async () => {
            const payment = mockPayment();
            prisma.payment_findFirst.mockResolvedValue(payment);

            const result = await service.getPaymentByOrderId(1);

            expect(result).toEqual(payment);
            expect(prisma.payment_findFirst).toHaveBeenCalledWith(
                expect.objectContaining({ where: { orderId: 1, isDeleted: false } }),
            );
        });

        it('throws NotFoundException when no payment exists for that order', async () => {
            prisma.payment_findFirst.mockResolvedValue(null);

            await expect(service.getPaymentByOrderId(99)).rejects.toThrow(NotFoundException);
        });
    });

    // ─── confirmPayment ───────────────────────────────────────────────────────

    describe('confirmPayment', () => {
        it('throws NotFoundException when payment does not exist', async () => {
            prisma.payment_findFirst.mockResolvedValue(null);

            await expect(service.confirmPayment({ paymentId: 1 })).rejects.toThrow(NotFoundException);
        });

        it('throws BadRequestException when payment is already PAID', async () => {
            prisma.payment_findFirst.mockResolvedValue(mockPayment({ status: PaymentStatus.PAID }));

            await expect(service.confirmPayment({ paymentId: 1 })).rejects.toThrow(BadRequestException);
        });

        it('confirms payment and returns the updated record', async () => {
            const payment = mockPayment();
            const updated = mockPayment({ status: PaymentStatus.PAID });

            prisma.payment_findFirst.mockResolvedValue(payment);
            // $transaction executes the callback and resolves; we then return the updated record
            prisma.$transaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
                fn({
                    payment: { update: jest.fn().mockResolvedValue(updated) },
                    order: { update: jest.fn().mockResolvedValue(null) },
                }),
            );
            prisma.payment_findUnique.mockResolvedValue(updated);

            const result = await service.confirmPayment({ paymentId: 1 });

            expect(result).toEqual(updated);
        });
    });

    // ─── cancelPayment ────────────────────────────────────────────────────────

    describe('cancelPayment', () => {
        it('throws NotFoundException when payment does not exist', async () => {
            prisma.payment_findFirst.mockResolvedValue(null);

            await expect(service.cancelPayment(99)).rejects.toThrow(NotFoundException);
        });

        it('throws BadRequestException when payment is already PAID', async () => {
            prisma.payment_findFirst.mockResolvedValue(mockPayment({ status: PaymentStatus.PAID }));

            await expect(service.cancelPayment(1)).rejects.toThrow(BadRequestException);
        });

        it('updates status to FAILED for a pending payment', async () => {
            const payment = mockPayment();
            const cancelled = mockPayment({ status: PaymentStatus.FAILED });

            prisma.payment_findFirst.mockResolvedValue(payment);
            prisma.payment_update.mockResolvedValue(cancelled);

            const result = await service.cancelPayment(1);

            expect(result).toEqual(cancelled);
            expect(prisma.payment_update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { status: PaymentStatus.FAILED } }),
            );
        });
    });

    // ─── getPaymentHistory ────────────────────────────────────────────────────

    describe('getPaymentHistory', () => {
        it('returns paginated payment list with correct meta', async () => {
            const payments = [mockPayment({ id: 1 }), mockPayment({ id: 2 })];
            prisma.$transaction.mockResolvedValue([5, payments]);

            const result = await service.getPaymentHistory({ page: 1, limit: 10 });

            expect(result.data).toEqual(payments);
            expect(result.meta.total).toBe(5);
            expect(result.meta.page).toBe(1);
            expect(result.meta.limit).toBe(10);
            expect(result.meta.totalPages).toBe(1);
        });

        it('filters by status when provided and returns empty result', async () => {
            prisma.$transaction.mockResolvedValue([0, []]);

            const result = await service.getPaymentHistory({ status: PaymentStatus.PAID, page: 1, limit: 10 });

            // Verify the filter still returns a valid paginated response
            expect(result.data).toEqual([]);
            expect(result.meta.total).toBe(0);
            expect(result.meta.totalPages).toBe(0);
            expect(prisma.$transaction).toHaveBeenCalled();
        });
    });
});
