jest.mock('@services/prisma/prisma.service', () => {
  return {
    PrismaService: jest.fn().mockImplementation(() => ({
      product: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      productVariant: {
        count: jest.fn(),
        aggregate: jest.fn(),
      },
    })),
  };
});

const mockCategoryService = {
  GetById: jest.fn(),
};

import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from '@services/prisma/prisma.service';
import { CATEGORY_SERVICE } from '@common/constant/service.interface.constant';
import { Decimal } from '@prisma/client/runtime/index-browser';

describe('ProductService', () => {
  let service: ProductService;

  const mockPrismaService = {
    product: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    productVariant: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  const mockCategoryService = {
    GetById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CATEGORY_SERVICE,
          useValue: mockCategoryService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Add', () => {
    it('should create product successfully', async () => {
      const dto = {
        name: 'Product A',
        categoryId: 1,
        price: new Decimal(100),
      };

      const category = { id: 1 };

      const product = {
        id: 1,
        name: 'Product A',
        categoryId: 1,
        price: new Decimal(100),
        isDeleted: false,
      };

      mockCategoryService.GetById.mockResolvedValue(category);
      mockPrismaService.product.findFirst.mockResolvedValue(null);
      mockPrismaService.product.create.mockResolvedValue(product);

      const result = await service.Add(dto as any);

      expect(mockCategoryService.GetById).toHaveBeenCalledWith(dto.categoryId);
      expect(mockPrismaService.product.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error if product name exists', async () => {
      const dto = {
        name: 'Product A',
        categoryId: 1,
      };

      mockCategoryService.GetById.mockResolvedValue({ id: 1 });

      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 1,
        name: 'Product A',
      });

      await expect(service.Add(dto as any)).rejects.toThrow(
        'Product with this name already exists',
      );
    });
  });

  describe('GetById', () => {
    it('should return product', async () => {
      const product = {
        id: 1,
        name: 'Product A',
        description: 'test',
        price: new Decimal(100),
        categoryId: 1,
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
      };

      mockPrismaService.product.findFirst.mockResolvedValue(product);

      const result = await service.GetById(1);

      expect(mockPrismaService.product.findFirst).toHaveBeenCalledWith({
        where: { id: 1, isDeleted: false },
      });

      expect(result).toBeDefined();
    });

    it('should throw error if product not found', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(service.GetById(1)).rejects.toThrow('Product not found');
    });
  });

  describe('ToggleActive', () => {
    it('should toggle product active status', async () => {
      const product = {
        id: 1,
        name: 'Product A',
        description: 'test',
        price: new Decimal(100),
        categoryId: 1,
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
      };
  

      const updatedProduct = {
        ...product,
        isActive: false,
      };

      mockPrismaService.product.findFirst.mockResolvedValue(product);
      mockPrismaService.product.update.mockResolvedValue(updatedProduct);

      const result = await service.ToggleActive(1);

      expect(mockPrismaService.product.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('IsInStock', () => {
    it('should return true if stock exists', async () => {
      mockPrismaService.productVariant.count.mockResolvedValue(5);

      const result = await service.IsInStock(1);

      expect(result).toBe(true);
    });

    it('should return false if no stock', async () => {
      mockPrismaService.productVariant.count.mockResolvedValue(0);

      const result = await service.IsInStock(1);

      expect(result).toBe(false);
    });
  });
});