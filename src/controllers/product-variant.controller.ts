import { PRODUCT_VARIANT_SERVICE } from "@common/constant/service.interface.constant";
import { Public } from "@common/decorators/public.decorator";
import { Roles } from "@common/decorators/roles.decorator";
import { PageFilterDto } from "@dto/page/page-filter.dto";
import { CreateProductVariantRequest } from "@dto/product-variant/create-product-variant.request";
import { UpdateProductVariantRequest } from "@dto/product-variant/update-product-variant.request";
import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { IProductVariantService } from "@services/product-variant/product-variant.service.interface";
import { S3Service } from "@services/s3/s3.service";
import { ROLE } from "generated/prisma/client";

@Controller('product-variants')
export class ProductVariantController {
    constructor(
        @Inject(PRODUCT_VARIANT_SERVICE)
        private readonly productVariantService: IProductVariantService,
    ) {}

    @Post()
    @Roles(ROLE.ADMIN)
    @UseInterceptors(FileInterceptor('file'))
    async create(
        @Body() dto: CreateProductVariantRequest, 
        @UploadedFile() file?: Express.Multer.File
    ) {
        const productVariant = await this.productVariantService.Add(dto, file);
        return {
            message: 'Product variant created successfully',
            data: productVariant,
        };
    }

    @Patch(':id')
    @Roles(ROLE.ADMIN)
    @UseInterceptors(FileInterceptor('file'))
    async update(
        @Body() dto: UpdateProductVariantRequest, 
        @Param('id') id: number,
        @UploadedFile() file?: Express.Multer.File
    ) {
        const productVariant = await this.productVariantService.Update(id, dto, file);
        return {
            message: 'Product variant updated successfully',
            data: productVariant,
        };
    }

    @Delete(':id')
    @Roles(ROLE.ADMIN)
    async softDelete(@Param('id') id: number) {
        const productVariant = await this.productVariantService.SoftDelete(id);
        return {
            message: 'Product variant deleted successfully',
            data: productVariant,
        };
    }

    @Post(':id/restore')
    @Roles(ROLE.ADMIN)
    async restore(@Param('id') id: number) {
        const productVariant = await this.productVariantService.Restore(id);
        return {
            message: 'Product variant restored successfully',
            data: productVariant,
        };
    }

    @Get(':id')
    @Public()
    async getById(@Param('id') id: number) {
        const productVariant = await this.productVariantService.GetById(id);
        return {
            message: 'Product variant retrieved successfully',
            data: productVariant,
        }; 
    }

    @Get('product/:productId')
    @Public()
    async getByProduct(
        @Param('productId') productId: number, 
        @Query() filter: PageFilterDto
    ) {
        const productVariants = await this.productVariantService.GetByProduct(productId, filter);
        return {
            message: 'Product variants retrieved successfully',
            data: productVariants,
        };
    }

    @Get('attributes')
    @Public()
    async getByAttributes(
        @Query('productId') productId: number, 
        @Query('size') size: string, 
        @Query('color') color: string
    ) {
        const productVariant = await this.productVariantService.GetByAttributes(productId, size, color);
        return {
            message: 'Product variant retrieved successfully',
            data: productVariant,
        };
    }

    @Post(':id/increase-stock')
    @Roles(ROLE.ADMIN)
    async increaseStock(
        @Param('id') id: number, 
        @Query('quantity') quantity: number
    ) {
        const productVariant = await this.productVariantService.IncreaseStock(id, quantity);
        return {
            message: 'Stock increased successfully',
            data: productVariant,
        };
    }

    @Post(':id/decrease-stock')
    @Roles(ROLE.ADMIN)
    async decreaseStock(
        @Param('id') id: number, 
        @Query('quantity') quantity: number
    ) {
        const productVariant = await this.productVariantService.DecreaseStock(id, quantity);
        return {
            message: 'Stock decreased successfully',
            data: productVariant,
        };
    }

    @Get(':id/is-in-stock')
    async isInStock(@Param('id') id: number) {
        const inStock = await this.productVariantService.IsInStock(id);
        return {
            message: 'Stock status retrieved successfully',
            data: inStock,
        };
    }

    @Get('product/:productId/total-stock')
    async getTotalStockByProduct(@Param('productId') productId: number) {
        const totalStock = await this.productVariantService.GetTotalStockByProduct(productId);
        return {
            message: 'Total stock retrieved successfully',
            data: totalStock,
        };
    }
}