jest.mock('@services/prisma/prisma.service', () => ({
    PrismaService: class PrismaService {},
}));

jest.mock('@services/s3/s3.service', () => ({
    S3Service: class S3Service {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ProductVariantService } from './product-variant.service';
import { PrismaService } from '@services/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { S3Service } from '@services/s3/s3.service';
import { PRODUCT_SERVICE } from '@common/constant/service.interface.constant';

describe('ProductVariantService', () => {
    let service: ProductVariantService;
    let mockS3Service: {
        uploadFile: jest.Mock;
        deleteFile: jest.Mock;
    };

    const mockPrismaService = {
        product: {
            findUnique: jest.fn(),
        },
        productVariant: {
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            updateMany: jest.fn(),
            aggregate: jest.fn(),
            count: jest.fn(),
            findMany: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductVariantService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: PRODUCT_SERVICE,
                    useValue: {
                        findById: jest.fn(),
                    },
                },
                {
                    provide: S3Service,
                    useValue: {
                        uploadFile: jest.fn(),
                        deleteFile: jest.fn(),
                    },
                },
            ],

        }).compile();

        service = module.get<ProductVariantService>(ProductVariantService);
        mockS3Service = module.get(S3Service) as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    /* ------------------------------------------------ */
    /* Add */
    /* ------------------------------------------------ */

    describe('Add', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should create variant successfully', async () => {
            const dto = {
                productId: 1,
                size: 'M',
                color: 'Red',
                price: 100,
                stockQuantity: 10,
            };

            const variant = {
                id: 1,
                productId: 1,
                size: 'M',
                color: 'Red',
                price: 100,
                stock: 10,
            };

            mockPrismaService.productVariant.create.mockResolvedValue(variant);

            const result = await service.Add(dto as any);

            expect(result).toMatchObject({
                id: 1,
                productId: 1,
                size: 'M',
                color: 'Red',
            });

            expect(mockPrismaService.productVariant.create).toHaveBeenCalledWith({
                data: {
                    productId: 1,
                    size: 'M',
                    color: 'Red',
                    price: 100,
                    stockQuantity: 10,
                },
            });
        });

        it('should rethrow unexpected errors from prisma create', async () => {
            mockPrismaService.productVariant.create.mockRejectedValue(new Error('db error'));

            await expect(
                service.Add({ productId: 1 } as any),
            ).rejects.toThrow('db error');
        });

        it('should throw error if variant already exists (P2002)', async () => {
            mockPrismaService.productVariant.create.mockRejectedValue({
                code: 'P2002',
            });

            await expect(
                service.Add({
                    productId: 1,
                    size: 'M',
                    color: 'Red',
                } as any),
            ).rejects.toThrow(BadRequestException);
        });

        it('should upload image and update variant when file is provided', async () => {
            const dto = {
                productId: 1,
                size: 'L',
                color: 'Blue',
                price: 120,
                stock: 5,
            };

            const file = {
                originalname: 'variant.jpg',
                mimetype: 'image/jpeg',
                buffer: Buffer.from('mock-image-content'),
            } as Express.Multer.File;

            const createdVariant = {
                id: 10,
                productId: 1,
                size: 'L',
                color: 'Blue',
                stock: 5,
                imageUrl: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const uploadedImageUrl = 'https://mock-bucket.s3.amazonaws.com/variant.jpg';

            const updatedVariant = {
                ...createdVariant,
                imageUrl: uploadedImageUrl,
            };

            mockPrismaService.productVariant.create.mockResolvedValue(createdVariant);
            mockS3Service.uploadFile.mockResolvedValue(uploadedImageUrl);
            mockPrismaService.productVariant.update.mockResolvedValue(updatedVariant);

            const result = await service.Add(dto as any, file);

            expect(mockPrismaService.productVariant.create).toHaveBeenCalledWith({
                data: dto,
            });
            expect(mockS3Service.uploadFile).toHaveBeenCalledWith(file);
            expect(mockPrismaService.productVariant.update).toHaveBeenCalledWith({
                where: { id: 10 },
                data: { imageUrl: uploadedImageUrl },
            });
            expect(result.imageUrl).toBe(uploadedImageUrl);
        });
    });

    /* ------------------------------------------------ */
    /* GetById */
    /* ------------------------------------------------ */

    describe('GetById', () => {
        it('should return variant', async () => {
            const variant = {
                id: 1,
                productId: 1,
                size: 'M',
                color: 'Red',
                stock: 10,
                imageUrl: null,
                isDeleted: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.productVariant.findUnique.mockResolvedValue(variant);

            const result = await service.GetById(1);

            expect(result).toMatchObject({
                id: 1,
                productId: 1,
                size: 'M',
                color: 'Red',
                stock: 10,
            });
        });

        it('should throw error if variant not found', async () => {
            mockPrismaService.productVariant.findUnique.mockResolvedValue(null);

            await expect(service.GetById(1)).rejects.toThrow(BadRequestException);
        });
    });

    /* ------------------------------------------------ */
    /* SoftDelete */
    /* ------------------------------------------------ */

    describe('SoftDelete', () => {
        it('should soft delete variant', async () => {
            const variant = {
                id: 1,
                productId: 1,
                size: 'M',
                color: 'Red',
                stock: 10,
                imageUrl: null,
                isDeleted: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.productVariant.findUnique.mockResolvedValue(variant);

            mockPrismaService.productVariant.update.mockResolvedValue({
                ...variant,
                isDeleted: true,
            });

            const result = await service.SoftDelete(1);

            expect(mockPrismaService.productVariant.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { isDeleted: true },
            });

            expect(result).toEqual({
                id: 1,
                productId: 1,
                size: 'M',
                color: 'Red',
                stock: 10,
                imageUrl: null,
                createdAt: variant.createdAt,
                updatedAt: variant.updatedAt,
            });
        });

        it('should throw error if variant not found', async () => {
            mockPrismaService.productVariant.findUnique.mockResolvedValue(null);

            await expect(service.SoftDelete(1)).rejects.toThrow(BadRequestException);
        });
    });

    /* Restore */
    describe('Restore', () => {
        it('should restore variant', async () => {
            const variant = {
                id: 1,
                productId: 1,
                size: 'M',
                color: 'Red',
                stock: 10,
                imageUrl: null,
                isDeleted: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.productVariant.findUnique.mockResolvedValue(variant);

            mockPrismaService.productVariant.update.mockResolvedValue({
                ...variant,
                isDeleted: false,
            });

            const result = await service.Restore(1);
            expect(mockPrismaService.productVariant.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { isDeleted: false },
            });

            expect(result).toEqual({
                id: 1,
                productId: 1,
                size: 'M',
                color: 'Red',
                stock: 10,
                imageUrl: null,
                createdAt: variant.createdAt,
                updatedAt: variant.updatedAt,
            });
        });

        it('should throw error if variant not found', async () => {
            mockPrismaService.productVariant.findUnique.mockResolvedValue(null);

            await expect(service.Restore(1)).rejects.toThrow(BadRequestException);
        });

    });

    /* IncreaseStock */
    describe('IncreaseStock', () => {
        it('should increase stock', async () => {
            const variant = {
                id: 1,
                productId: 1,
                size: 'M',
                color: 'Red',
                stock: 10,
                imageUrl: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.productVariant.findUnique.mockResolvedValue(variant);

            mockPrismaService.productVariant.update.mockResolvedValue({
                ...variant,
                stock: 20,
            });

            const result = await service.IncreaseStock(1, 10);

            expect(mockPrismaService.productVariant.update).toHaveBeenCalledWith({
                where: { id: 1, isDeleted: false },
                data: {
                    stock: { increment: 10 },
                },
            });
            expect(result.stock).toBe(20);
        });

        it('should throw error if quantity <= 0', async () => {
            mockPrismaService.productVariant.findUnique.mockResolvedValue({
                id: 1,
                productId: 1,
                size: 'M',
                color: 'Red',
                stock: 10,
                imageUrl: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            await expect(service.IncreaseStock(1, 0)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    /* ------------------------------------------------ */
    /* DecreaseStock */
    /* ------------------------------------------------ */

    describe('DecreaseStock', () => {
        it('should decrease stock', async () => {
            const variant = {
                id: 1,
                productId: 1,
                size: 'M',
                color: 'Red',
                stock: 5,
                imageUrl: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.productVariant.updateMany.mockResolvedValue({ count: 1 });

            mockPrismaService.productVariant.findUnique.mockResolvedValue(variant);

            const result = await service.DecreaseStock(1, 5);

            expect(mockPrismaService.productVariant.updateMany).toHaveBeenCalledWith({
                where: {
                    id: 1,
                    stock: { gte: 5 },
                    isDeleted: false,
                },
                data: {
                    stock: { decrement: 5 },
                },
            });
            expect(result.stock).toBe(5);
        });

        it('should throw error if stock not enough', async () => {
            mockPrismaService.productVariant.updateMany.mockResolvedValue({ count: 0 });

            await expect(service.DecreaseStock(1, 5)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    /* ------------------------------------------------ */
    /* IsInStock */
    /* ------------------------------------------------ */

    describe('IsInStock', () => {
        it('should return true if stock > 0', async () => {
            mockPrismaService.productVariant.findUnique.mockResolvedValue({
                stock: 5,
            });

            const result = await service.IsInStock(1);

            expect(result).toBe(true);
        });

        it('should return false if stock = 0', async () => {
            mockPrismaService.productVariant.findUnique.mockResolvedValue({
                stock: 0,
            });

            const result = await service.IsInStock(1);

            expect(result).toBe(false);
        });
    });

    /* ------------------------------------------------ */
    /* GetTotalStockByProduct */
    /* ------------------------------------------------ */

    describe('GetTotalStockByProduct', () => {
        it('should return total stock', async () => {
            mockPrismaService.productVariant.aggregate.mockResolvedValue({
                _sum: { stock: 15 },
            });

            const result = await service.GetTotalStockByProduct(1);

            expect(result).toBe(15);
        });

        it('should return 0 if no variants', async () => {
            mockPrismaService.productVariant.aggregate.mockResolvedValue({
                _sum: { stock: null },
            });

            const result = await service.GetTotalStockByProduct(1);

            expect(result).toBe(0);
        });
    });
});