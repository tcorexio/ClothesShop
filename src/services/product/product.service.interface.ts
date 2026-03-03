import { PageFilterDto } from "@dto/page/page-filter.dto";
import { CreateProductRequest } from "@dto/product/create-product.request";
import { ProductFilterRequest } from "@dto/product/product-filter.request";
import { ProductResponse } from "@dto/product/product.response";
import { UpdateProductRequest } from "@dto/product/update-product.request";
import { PageResponseModel } from "@models/page/page-response.model";

export interface IProductService {
    Add(data: CreateProductRequest): Promise<ProductResponse>;
    Update(id: number, data: UpdateProductRequest): Promise<ProductResponse>;
    SoftDelete(id: number): Promise<ProductResponse>; //Xóa mềm isDeleted = true
    Restore(id: number): Promise<ProductResponse>; // Khôi phục xóa mềm isDeleted = false
    GetAll(data: PageFilterDto): Promise<PageResponseModel<ProductResponse>>; // Lấy toàn bộ sản phẩm isDeleted = false
    GetById(id: number): Promise<ProductResponse>;
    GetByName(name: string): Promise<ProductResponse>;
    Search(data: ProductFilterRequest): Promise<PageResponseModel<ProductResponse>>; //Tìm kiếm theo từ khóa.
    GetByCategory(categoryId: number, filter: PageFilterDto): Promise<any>; //Lấy sản phẩm theo category.
    GetByPriceRange(min: number, max: number, filter: PageFilterDto): Promise<PageResponseModel<ProductResponse>>; //Filter theo khoảng giá.
    Activate(id: number): Promise<ProductResponse>; //Bật sản phẩm isActive = true
    Deactivate(id: number): Promise<ProductResponse>; //Tắt sản phẩm isActive = false
    ToggleActive(id: number): Promise<ProductResponse>; //Đảo trạng thái isActive
    IsInStock(id: number): Promise<boolean>; //Kiểm tra còn hàng không
    GetTotalStock(id: number): Promise<number>; //Lấy tổng số lượng tồn kho của sản phẩm
    Count(): Promise<number>; //Đếm tổng số sản phẩm
    CountByCategory(categoryId: number): Promise<number>;  //Đếm số sản phẩm theo category
}