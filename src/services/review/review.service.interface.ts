import { PageFilterDto } from "@dto/page/page-filter.dto";
import { ProductRatingSummaryResponse } from "@dto/review/productRatingSummary.response";
import { ReviewResponse } from "@dto/review/review.response";
import { PageResponseModel } from "@models/page/page-response.model";

export interface IReviewService{
    Add(data: any): Promise<ReviewResponse>;
    Update(id: number, data: any): Promise<ReviewResponse>;
    SoftDelete(id: number): Promise<ReviewResponse>;
    Restore(id: number): Promise<ReviewResponse>;
    Delete(id: number): Promise<any>;
    GetById(id: number): Promise<ReviewResponse>;
    GetReviewsByProduct(productId: number, filter: PageFilterDto): Promise<PageResponseModel<ReviewResponse>>;
    GetReviewsByUser(userId: number, filter: PageFilterDto): Promise<PageResponseModel<ReviewResponse>>;
    HasReviewed(userId: number, productId: number): Promise<boolean>;
    GetAverageRating(productId: number): Promise<ProductRatingSummaryResponse>;
    GetReviewCount(productId: number): Promise<number>;
}