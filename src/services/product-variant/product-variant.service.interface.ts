import { PageFilterDto } from "@dto/page/page-filter.dto";
import { CreateProductVariantRequest } from "@dto/product-variant/create-product-variant.request";
import { ProductVariantResponse } from "@dto/product-variant/product-variant.response";
import { UpdateProductVariantRequest } from "@dto/product-variant/update-product-variant.request";
import { PageResponseModel } from "@models/page/page-response.model";

export interface IProductVariantService {
    Add(data: CreateProductVariantRequest, file?: Express.Multer.File): Promise<ProductVariantResponse>;
    Update(id: number, data: UpdateProductVariantRequest, file?: Express.Multer.File): Promise<ProductVariantResponse>;
    SoftDelete(id: number): Promise<ProductVariantResponse>; //Xóa mềm (isDeleted = true).
    Restore(id: number): Promise<ProductVariantResponse>; //Khôi phục xóa mềm (isDeleted = false).
    GetById(id: number): Promise<ProductVariantResponse>; //Lấy biến thể sản phẩm theo ID.
    GetByProduct(productId: number, filter: PageFilterDto): Promise<PageResponseModel<ProductVariantResponse>>; //Lấy tất cả biến thể của một sản phẩm.
    GetByAttributes(productId: number, size: string, color: string): Promise<ProductVariantResponse>; //Lấy biến thể sản phẩm theo thuộc tính (size, color).
    IncreaseStock(id: number, quantity: number): Promise<ProductVariantResponse>; //Tăng số lượng tồn kho của biến thể sản phẩm.
    DecreaseStock(id: number, quantity: number): Promise<ProductVariantResponse>; //Giảm số lượng tồn kho của biến thể sản phẩm.
    IsInStock(id: number): Promise<boolean>; //Kiểm tra xem biến thể sản phẩm còn hàng hay không (stockQuantity > 0).
    GetTotalStockByProduct(productId: number): Promise<number>; //Lấy tổng số lượng tồn kho của tất cả biến thể thuộc một sản phẩm.
}