import { CATEGORY_SERVICE } from "@common/constant/service.interface.constant";
import { Public } from "@common/decorators/public.decorator";
import { Roles } from "@common/decorators/roles.decorator";
import { CreateCategoryRequest } from "@dto/category/create-category.request";
import { UpdateCategoryRequest } from "@dto/category/update-category.request";
import { PageFilterDto } from "@dto/page/page-filter.dto";
import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import type { ICategoryService } from "@services/category/category.service.interface";
import { ROLE } from "generated/prisma/enums";

@Controller('categories')
export class CategoryController {
    constructor(
        @Inject(CATEGORY_SERVICE)
        private readonly categoryService: ICategoryService,
    ) {}

    @Roles(ROLE.ADMIN)
    @Post()
    async create(@Body() dto: CreateCategoryRequest) {
        const result = await this.categoryService.Add(dto);
        return {
            message: 'Category created successfully',
            data: result,
        };
    }

    @Roles(ROLE.ADMIN)
    @Patch(':id')
    async update(@Param('id') id: number, @Body() dto: UpdateCategoryRequest) {
        const result = await this.categoryService.Update(id, dto);
        return {
            message: 'Category updated successfully',
            data: result,
        };
    }

    @Roles(ROLE.ADMIN)
    @Delete(':id')
    async softDelete(@Param('id') id: number) {
        const result = await this.categoryService.SoftDeleteAsync(id);
        return {
            message: 'Category deleted successfully',
            data: result,
        };
    }

    @Public()
    @Get()
    async getAll(@Query() data: PageFilterDto) {
        const result = await this.categoryService.GetAll(data);
        return {
            message: 'Categories retrieved successfully',
            data: result,
        };
    }

    @Get(':id')
    async getById(@Param('id') id: number) {
        const result = await this.categoryService.GetById(id);
        return {
            message: 'Category retrieved successfully',
            data: result,
        };
    }

    @Get('by-title/:title')
    async getByTitle(@Param('title') title: string) {
        const result = await this.categoryService.GetByTitle(title);
        return {
            message: 'Category retrieved successfully',
            data: result,
        };
    }
}