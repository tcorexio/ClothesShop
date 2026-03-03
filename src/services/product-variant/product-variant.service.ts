import { CreateProductVariantRequest } from "@dto/product-variant/create-product-variant.request";
import { ProductVariantResponse } from "@dto/product-variant/product-variant.response";
import type { IProductVariantService } from "./product-variant.service.interface";
import { UpdateProductVariantRequest } from "@dto/product-variant/update-product-variant.request";
import { PageResponseModel } from "@models/page/page-response.model";
import { PrismaService } from "@services/prisma/prisma.service";
import { BadRequestException, Inject } from "@nestjs/common";
import { PRODUCT_SERVICE } from "@common/constant/service.interface.constant";
import { toProductVariantResponse } from "src/mapper/product-variant.mapper";
import { PageFilterDto } from "@dto/page/page-filter.dto";
import type { IProductService } from "@services/product/product.service.interface";
import { S3Service } from "@services/s3/s3.service";
import e from "express";

export class ProductVariantService implements IProductVariantService {
    constructor(
        private readonly prismaService: PrismaService,
        @Inject(PRODUCT_SERVICE)
        private readonly productService: IProductService,
        private readonly s3Service: S3Service,
        
    ) {}

    async Add(data: CreateProductVariantRequest, file?: Express.Multer.File): Promise<ProductVariantResponse> {
        let productVariant;
        let imageUrl: string | undefined;
        
        try {
            productVariant = await this.prismaService.productVariant.create({
                data: {
                    ...data,
                }
            });

            if (file) {
                imageUrl = await this.s3Service.uploadFile(file);
                productVariant = await this.prismaService.productVariant.update({
                    where: { id: productVariant.id },
                    data: { imageUrl },
                });
            }

            return toProductVariantResponse(productVariant);

        } catch (error) {
            if (imageUrl) {
                await this.s3Service.deleteFile(imageUrl);
            }

            if (productVariant?.id) {
                await this.prismaService.productVariant.delete({
                    where: { id: productVariant.id },
                })
            }

            if (error.code === 'P2002') {
                throw new BadRequestException('A product variant with the same size and color already exists for this product');
            }
            
            throw error;
        }
    }

    async Update(id: number, data: UpdateProductVariantRequest, file?: Express.Multer.File): Promise<ProductVariantResponse> {
        const existingVariant = await this.GetById(id); 

        let newImageUrl : string | undefined;

        try {
            if (file) {
                newImageUrl = await this.s3Service.uploadFile(file);
            }

            const updatedVariant = await this.prismaService.productVariant.update({
                where: { id },
                data: { 
                    ...data,
                    ...(newImageUrl && { imageUrl: newImageUrl }),
                },
            });

            if (file && existingVariant.imageUrl) {
                await this.s3Service.deleteFile(existingVariant.imageUrl);
            }

            return toProductVariantResponse(updatedVariant);
        } catch (error) {
            if (newImageUrl) {
                await this.s3Service.deleteFile(newImageUrl);
            }
            if (error.code === 'P2002') {
                throw new BadRequestException('A product variant with the same size and color already exists for this product');
            }
            throw error;
        }
    }
    
    async Delete(id: number): Promise<ProductVariantResponse> {
        await this.GetById(id);
        const deletedVariant = await this.prismaService.productVariant.delete({
            where: { id },
        });
        return toProductVariantResponse(deletedVariant);
    }

    async SoftDelete(id: number): Promise<ProductVariantResponse> {
        await this.GetById(id);
        const deletedVariant = await this.prismaService.productVariant.update({
            where: { id },
            data: { isDeleted: true },
        });
        return toProductVariantResponse(deletedVariant);
    }

    async Restore(id: number): Promise<ProductVariantResponse> {
        await this.GetById(id);
        const restoredVariant = await this.prismaService.productVariant.update({
            where: { id },
            data: { isDeleted: false },
        });
        return toProductVariantResponse(restoredVariant);
    }

    async GetById(id: number): Promise<ProductVariantResponse> {
        const productVariant = await this.prismaService.productVariant.findUnique({
            where: { id },
        });
        if (!productVariant) {
            throw new BadRequestException('Product variant not found');
        }
        return toProductVariantResponse(productVariant);
    }

    async GetByProduct(productId: number, filter: PageFilterDto): Promise<PageResponseModel<ProductVariantResponse>> {
        await this.productService.GetById(productId);
        const skip = (filter.page - 1) * filter.limit;
        const variants = await this.prismaService.productVariant.findMany({
            where: { productId, isDeleted: false },
            skip,
            take: filter.limit,
        });

        const totalItems = await this.prismaService.productVariant.count({
            where: { productId, isDeleted: false  },
        });

        const totalPages = Math.ceil(totalItems / filter.limit);

        return {
            content: variants.map(toProductVariantResponse),
            totalItems,
            totalPages,
            pageNumber: filter.page,
            pageSize: filter.limit,
        };
    }

    async GetByAttributes(productId: number, size: string, color: string): Promise<ProductVariantResponse> {
        const productVariant = await this.prismaService.productVariant.findFirst({
            where: {
                productId,
                size,
                color,
                isDeleted: false,
            }
        });

        if (!productVariant) {
            throw new BadRequestException('Product variant not found with the specified attributes');
        }

        return toProductVariantResponse(productVariant);
    }

    async IncreaseStock(id: number, quantity: number): Promise<ProductVariantResponse> {
        await this.GetById(id);
        
        if (quantity <= 0) {
            throw new BadRequestException('Quantity must be greater than zero');
        }
        const updateProductVariant = await this.prismaService.productVariant.update({
            where: { id , isDeleted: false },
            data: {
                stock: { increment: quantity }
            }
        });
        return toProductVariantResponse(updateProductVariant);
    }

    async DecreaseStock(id: number, quantity: number): Promise<ProductVariantResponse> {
        if (quantity <= 0) {
            throw new BadRequestException('Quantity must be greater than 0');
        }

        const updateProductVariant = await this.prismaService.productVariant.updateMany({
            where: { 
                id , 
                stock: { gte: quantity }, 
                isDeleted: false 
            },
            data: {
                stock: { decrement: quantity }
            }
        });

        if (updateProductVariant.count === 0) {
            throw new BadRequestException('Not enough stock or variant not found');
        }

        
        return this.GetById(id);
    }

    async IsInStock(id: number): Promise<boolean> {
        const productVariant = await this.prismaService.productVariant.findUnique({
            where: { id },
            select: { stock: true , isDeleted: false }
        });
        if (!productVariant) {
            throw new BadRequestException('Product variant not found');
        }   
        return  productVariant.stock > 0;
    }

    async GetTotalStockByProduct(productId: number): Promise<number> {
        const result = await this.prismaService.productVariant.aggregate({
            where: { productId, isDeleted: false },
            _sum: { stock: true },
        });
        return result._sum.stock ?? 0;
    }
}