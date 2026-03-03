import { CategoryResponse } from "@dto/category/category.response";
import { CreateCategoryRequest } from "@dto/category/create-category.request";
import { UpdateCategoryRequest } from "@dto/category/update-category.request";
import { PageFilterDto } from "@dto/page/page-filter.dto";
import { PageResponseModel } from "@models/page/page-response.model";

export interface ICategoryService {
    Add(data: CreateCategoryRequest): Promise<CategoryResponse>;
    Update(id: number, data: UpdateCategoryRequest): Promise<CategoryResponse>;
    SoftDeleteAsync(id: number): Promise<CategoryResponse>;
    GetAll(data: PageFilterDto): Promise<PageResponseModel<CategoryResponse>>;
    GetById(id: number): Promise<CategoryResponse>;
    GetByTitle(title: string): Promise<CategoryResponse>;
}