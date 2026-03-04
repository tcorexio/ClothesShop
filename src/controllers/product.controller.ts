import { CATEGORY_SERVICE, PRODUCT_SERVICE } from "@common/constant/service.interface.constant";
import { Public } from "@common/decorators/public.decorator";
import { Roles } from "@common/decorators/roles.decorator";
import { PageFilterDto } from "@dto/page/page-filter.dto";
import { CreateProductRequest } from "@dto/product/create-product.request";
import { ProductFilterRequest } from "@dto/product/product-filter.request";
import { UpdateProductRequest } from "@dto/product/update-product.request";
import { Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import type { ICategoryService } from "@services/category/category.service.interface";
import type { IProductService } from "@services/product/product.service.interface";
import { ROLE } from "generated/prisma/enums";

@Controller('products')
export class ProductController {
    constructor(
        @Inject(PRODUCT_SERVICE)
        private readonly productService: IProductService,
    ) {}
    
    @Post()
    @Roles(ROLE.ADMIN)
    async create(@Body() dto: CreateProductRequest) {
        const product = await this.productService.Add(dto);
        return {
            message: 'Product created successfully',
            data: product,
        };
    }

    @Patch(':id')
    @Roles(ROLE.ADMIN)
    async update(@Body() dto: UpdateProductRequest, @Param('id') id: number) {
        const product = await this.productService.Update(id, dto);
        return {
            message: 'Product updated successfully',
            data: product,
        };
    }

    @Delete(':id')
    @Roles(ROLE.ADMIN)
    async softDelete(@Param('id') id: number) {
        const product = await this.productService.SoftDelete(id);
        return {
            message: 'Product deleted successfully',
            data: product,
        };
    }

    @Post(':id/restore')
    @Roles(ROLE.ADMIN)
    async restore(@Param('id') id: number) {
        const product = await this.productService.Restore(id);
        return {
            message: 'Product restored successfully',
            data: product,
        };
    }

    @Get()
    @Public()
    async getAll(@Query() data: PageFilterDto) {
        const products = await this.productService.GetAll(data);
        return {
            message: 'Products retrieved successfully',
            data: products,
        };
    }

    @Get('by-name/:name')
    @Public()
    async getByName(@Param('name') name: string) {
        const product = await this.productService.GetByName(name);
        return {
            message: 'Product retrieved successfully',
            data: product,
        };  
    }

    @Get('search')
    @Public()
    async search(@Query() data: ProductFilterRequest) {
        const products = await this.productService.Search(data);
        return {
            message: 'Products retrieved successfully',
            data: products,
        };
    }

    @Get('by-category/:categoryId')
    @Public()
    async getByCategory(@Param('categoryId') categoryId: number, @Query() filter: PageFilterDto) {
        const products = await this.productService.GetByCategory(categoryId, filter);
        return {
            message: 'Products retrieved successfully',
            data: products,
        };
    }

    @Get('by-price-range')
    @Public()
    async getByPriceRange(@Query('min') min: number, @Query('max') max: number, @Query() filter: PageFilterDto) {
        const products = await this.productService.GetByPriceRange(min, max, filter);
        return {
            message: 'Products retrieved successfully',
            data: products,
        };
    }

    @Post(':id/activate')
    @Roles(ROLE.ADMIN)
    async activate(@Param('id') id: number) {
        const product = await this.productService.Activate(id);
        return {
            message: 'Product activated successfully',
            data: product,
        };
    }

    @Post(':id/deactivate')
    @Roles(ROLE.ADMIN)
    async deactivate(@Param('id') id: number) {
        const product = await this.productService.Deactivate(id);
        return {
            message: 'Product deactivated successfully',
            data: product,
        };
    }

    @Post(':id/toggle-active')
    @Roles(ROLE.ADMIN)
    async toggleActive(@Param('id') id: number) {
        const product = await this.productService.ToggleActive(id);
        return {
            message: 'Product active status toggled successfully',
            data: product,
        };
    }

    @Get(':id/in-stock')
    @Public()
    async isInStock(@Param('id') id: number) {
        const inStock = await this.productService.IsInStock(id);
        return {
            message: 'Product stock status retrieved successfully',
            data: inStock,
        };
    }

    @Get(':id/total-stock')
    @Public()
    async getTotalStock(@Param('id') id: number) {
        const totalStock = await this.productService.GetTotalStock(id);
        return {
            message: 'Product total stock retrieved successfully',
            data: totalStock,
        };
    }

    @Get('count')
    @Public()
    async count() {
        const totalProducts = await this.productService.Count();
        return {
            message: 'Total products counted successfully',
            data: totalProducts,
        };
    }

    @Get('count-by-category/:categoryId')
    @Public()
    async countByCategory(@Param('categoryId') categoryId: number) {
        const totalProducts = await this.productService.CountByCategory(categoryId);
        return {
            message: 'Total products in category counted successfully',
            data: totalProducts,
        };
    }

    @Get(':id')
    @Public()
    async getById(@Param('id', ParseIntPipe) id: number) {
        const product = await this.productService.GetById(id);
        return {
            message: 'Product retrieved successfully',
            data: product,
        };
    }
    
}