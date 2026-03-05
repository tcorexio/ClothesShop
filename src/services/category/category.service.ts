
import { CreateCategoryRequest } from "@dto/category/create-category.request";
import { ICategoryService } from "./category.service.interface";
import { PrismaService } from "@services/prisma/prisma.service";
import { UpdateCategoryRequest } from "@dto/category/update-category.request";
import { CategoryResponse } from "@dto/category/category.response";
import { PageResponseModel } from "@models/page/page-response.model";
import { BadRequestException, Injectable } from "@nestjs/common";
import { PageFilterDto } from "@dto/page/page-filter.dto";

@Injectable()
export class CategoryService implements ICategoryService {
    constructor(
        private readonly prismaService: PrismaService,
    ) {}

    async Add(data: CreateCategoryRequest): Promise<CategoryResponse> {
        const existingCategory = await this.prismaService.category.findFirst({
            where: { title: data.title, isDeleted: false },
        });
        if (existingCategory) {
            throw new BadRequestException('Category with this title already exists');
        }
        return await this.prismaService.category.create({
            data,
        });
    }

    async Update(id: number, data: UpdateCategoryRequest): Promise<CategoryResponse> {
        await this.GetById(id);
        const existingCategory = await this.prismaService.category.findFirst({
            where: { title: data.title, isDeleted: false },
        });
        
        if (existingCategory && existingCategory.id !== id) {
            throw new BadRequestException('Category with this title already exists');
        }

        return await this.prismaService.category.update({
            where: { id },
            data,
        });
    }

    async SoftDeleteAsync(id: number): Promise<CategoryResponse> {
        return await this.prismaService.category.update({
            where: { id },
            data: { isDeleted: true },
        });
    }

    async GetAll(data: PageFilterDto): Promise<PageResponseModel<CategoryResponse>> {
        data.normalize();
        const skip = (data.page - 1) * data.limit;

        const totalItems = await this.prismaService.category.count({    
            where: { isDeleted: false },
        });

        const categories = await this.prismaService.category.findMany({
            where: { isDeleted: false },
            skip,
            take: data.limit,
            
        });

        const totalPages = Math.ceil(totalItems / data.limit);

        return {
            content: categories,
            totalItems,
            totalPages,
            pageNumber: data.page,
            pageSize: data.limit,
        };
    }

    async GetById(id: number): Promise<CategoryResponse> {
        const category = await this.prismaService.category.findUnique({
            where: { id, isDeleted: false },
        });

        if (!category) {
            throw new BadRequestException('Category not found');
        }
        return category;
    }

    async GetByTitle(title: string): Promise<CategoryResponse> {
        const category = await this.prismaService.category.findFirst({
            where: { title, isDeleted: false },
        });

        if (!category) {
            throw new BadRequestException('Category not found');
        }
        return category;
    }
}        