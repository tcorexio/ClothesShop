import { ProductResponse } from "@dto/product/product.response";
import { IProductService } from "./product.service.interface";
import { CreateProductRequest } from "@dto/product/create-product.request";
import { UpdateProductRequest } from "@dto/product/update-product.request";
import { PageResponseModel } from "@models/page/page-response.model";
import { PrismaService } from "@services/prisma/prisma.service";
import type { ICategoryService } from "@services/category/category.service.interface";
import { toProductResponse } from "src/mapper/product.mapper";
import { CATEGORY_SERVICE } from "@common/constant/service.interface.constant";
import { BadRequestException, Inject, Logger } from "@nestjs/common";
import { PageFilterDto } from "@dto/page/page-filter.dto";
import { ProductFilterRequest } from "@dto/product/product-filter.request";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { BadRequestError } from "@payos/node";

export class ProductService implements IProductService {
    private readonly logger = new Logger(ProductService.name);
    private readonly getAllCacheKeysIndex = 'products:getall:keys';

    constructor(
        private readonly prismaService: PrismaService,
        @Inject(CATEGORY_SERVICE)
        private readonly categoryService: ICategoryService,
        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache,
    ) {}

    private async registerGetAllCacheKey(cacheKey: string): Promise<void> {
        const keys = (await this.cacheManager.get<string[]>(this.getAllCacheKeysIndex)) ?? [];

        if (!keys.includes(cacheKey)) {
            await this.cacheManager.set(this.getAllCacheKeysIndex, [...keys, cacheKey]);
        }
    }

    private async clearGetAllCache(): Promise<void> {
        const keys = (await this.cacheManager.get<string[]>(this.getAllCacheKeysIndex)) ?? [];

        if (keys.length > 0) {
            await Promise.all(keys.map((key) => this.cacheManager.del(key)));
        }

        await this.cacheManager.del(this.getAllCacheKeysIndex);
    }

    async Add(data: CreateProductRequest): Promise<ProductResponse> {
        const category = await this.categoryService.GetById(data.categoryId);

        const existingProduct = await this.prismaService.product.findFirst({
            where: { name: data.name, isDeleted: false },
        });

        if (existingProduct) {
            throw new BadRequestException('Product with this name already exists');
        }

        const product = await this.prismaService.product.create({
            data: {
                ...data,
                categoryId: category.id,
            },
        });

        return toProductResponse(product);
    }

    async Update(id: number, data: UpdateProductRequest): Promise<ProductResponse> {
        await this.GetById(id);

        const existingProduct = await this.prismaService.product.findFirst({
            where: { name: data.name, isDeleted: false },
        });

        if (existingProduct && existingProduct.id !== id) {
            throw new BadRequestException('Product with this name already exists');
        }

        const product = await this.prismaService.product.update({
            where: { id },
            data,
        });

        await this.clearGetAllCache();

        return toProductResponse(product);
    }

    async SoftDelete(id: number): Promise<ProductResponse> {
        await this.GetById(id);
        const product = await this.prismaService.product.update({
            where: { id },
            data: { isDeleted: true },
        });
        return toProductResponse(product);
    }

    async Restore(id: number): Promise<ProductResponse> {
        const product = await this.prismaService.product.update({
            where: { id },
            data: { isDeleted: false },
        });
        return toProductResponse(product);
    }

    async GetAll(data: PageFilterDto): Promise<PageResponseModel<ProductResponse>> {
        const startedAt = Date.now();
        data.normalize();

        const cacheKey = `products:getall:${data.page}:${data.limit}`;
        const cached = await this.cacheManager.get<PageResponseModel<ProductResponse>>(cacheKey);

        if (cached) {
            const duration = Date.now() - startedAt;
            this.logger.log(`[CACHE HIT] ${cacheKey} - ${duration}ms`);
            return cached;
        }

        const skip = (data.page - 1) * data.limit;

        const totalItems = await this.Count();

        const products = await this.prismaService.product.findMany({
            where: { isDeleted: false },
            skip,
            take: data.limit,
        });

        const totalPages = Math.ceil(totalItems / data.limit);

        const result = {
            content: products.map(toProductResponse),
            totalItems,
            totalPages,
            pageNumber: data.page,
            pageSize: data.limit,
        };

        await this.cacheManager.set(cacheKey, result);
        await this.registerGetAllCacheKey(cacheKey);
        const duration = Date.now() - startedAt;
        this.logger.log(`[CACHE MISS] ${cacheKey} - ${duration}ms`);

        return result;
    }

    async GetAll1(data: PageFilterDto): Promise<PageResponseModel<ProductResponse>> {
        data.normalize();
        const skip = (data.page - 1) * data.limit;

        const totalItems = await this.Count();

        const products = await this.prismaService.product.findMany({
            where: { isDeleted: false },
            skip,
            take: data.limit,
        });

        const totalPages = Math.ceil(totalItems / data.limit);

        return {
            content: products.map(toProductResponse),
            totalItems,
            totalPages,
            pageNumber: data.page,
            pageSize: data.limit,
        };
    }

    async GetById(id: number): Promise<ProductResponse> {
        const product = await this.prismaService.product.findFirst({
            where: { id, isDeleted: false }
        });

        if (!product) {
            throw new BadRequestException('Product not found');
        }

        return toProductResponse(product);
    }

    async GetByName(name: string): Promise<ProductResponse> {
        const product = await this.prismaService.product.findFirst({
            where: { name, isDeleted: false },
        });

        if (!product) {
            throw new BadRequestException('Product not found');
        }

        return toProductResponse(product);
    }

    async Search(data: ProductFilterRequest): Promise<PageResponseModel<ProductResponse>> {
        data.normalize();
        const skip = (data.page - 1) * data.limit;

        const totalItems = await this.prismaService.product.count({
            where: { 
                name: { contains: data.keyword, mode: 'insensitive' },
                isDeleted: false,
            },
        });

        const products = await this.prismaService.product.findMany({
            where: {
                name: { contains: data.keyword, mode: 'insensitive' },
                isDeleted: false,
            },
            skip,
            take: data.limit,
        });


        const totalPages = Math.ceil(totalItems / data.limit);

        return {
            content: products.map(toProductResponse),
            totalItems,
            totalPages,
            pageNumber: data.page,
            pageSize: data.limit,
        };
    }

    async GetByCategory(categoryId: number, filter: PageFilterDto): Promise<PageResponseModel<ProductResponse>> {
        await this.categoryService.GetById(categoryId);
        const skip = (filter.page - 1) * filter.limit;
        const products = await this.prismaService.product.findMany({
            where: {
                categoryId,
                isDeleted: false,
            },
            skip,
            take: filter.limit,
        });

        const totalItems = await this.prismaService.product.count({
            where: {
                categoryId,
                isDeleted: false,
            },
        });

        const totalPages = Math.ceil(totalItems / filter.limit);

        return {
            content: products.map(toProductResponse),
            totalItems,
            totalPages,
            pageNumber: filter.page,
            pageSize: filter.limit,
        };
    }

    async GetByPriceRange(min: number, max: number, filter: PageFilterDto): Promise<PageResponseModel<ProductResponse>> {
        const skip = (filter.page - 1) * filter.limit;
        const products = await this.prismaService.product.findMany({
            where: {
                price: { gte: min, lte: max },
                isDeleted: false,
            },
            skip,
            take: filter.limit,
        });

        const totalItems = await this.prismaService.product.count({
            where: {
                price: { gte: min, lte: max },
                isDeleted: false,
            },
        });

        const totalPages = Math.ceil(totalItems / filter.limit);

        return {
            content: products.map(toProductResponse),
            totalItems,
            totalPages,
            pageNumber: filter.page,
            pageSize: filter.limit,
        };
    }

    async Activate(id: number): Promise<ProductResponse> {
        await this.GetById(id);
        const product = await this.prismaService.product.update({
            where: { id },
            data: { isActive: true },
        });
        return toProductResponse(product);
    }

    async Deactivate(id: number): Promise<ProductResponse> {
        await this.GetById(id);
        const product = await this.prismaService.product.update({
            where: { id },
            data: { isActive: false },
        });
        return toProductResponse(product);
    }

    async ToggleActive(id: number): Promise<ProductResponse> {
        const product = await this.prismaService.product.findFirst({
            where: { id , isDeleted: false},
        });

        if (!product) {
            throw new BadRequestException('Product not found');
        }

        const updatedProduct = await this.prismaService.product.update({
            where: { id },
            data: { isActive: !product.isActive },
        });

        return toProductResponse(updatedProduct);
    }

    async IsInStock(id: number): Promise<boolean> {
        // const product = await this.prismaService.product.findUnique({
        //     where: { id , isDeleted: false},
        //     select: { 
        //         variants: {
        //             where: { isDeleted: false },
        //             select: { stock: true }
        //         }
        //     }
        // });

        // if (!product) {
        //     throw new Error('Product not found');
        // }
        // return product.variants.some(variant => variant.stock > 0);

        const count = await this.prismaService.productVariant.count({
            where: {
                productId: id,
                isDeleted: false,
                stock: { gt: 0 },
            }
        });

        return count > 0;
    }

    async GetTotalStock(id: number): Promise<number> {
        const result = await this.prismaService.productVariant.aggregate({
            where: { productId: id, isDeleted: false },
            _sum: { stock: true },
        });
        return result._sum.stock ?? 0;
    }  

    async Count(): Promise<number> {
        return await this.prismaService.product.count({
            where: { isDeleted: false },
        });
    }

    async CountByCategory(categoryId: number): Promise<number> {
        return await this.prismaService.product.count({
            where: { categoryId, isDeleted: false },
        });
    }
}