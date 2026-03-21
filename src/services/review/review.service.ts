import { PrismaService } from "@services/prisma/prisma.service";
import { IReviewService } from "./review.service.interface";
import { BadRequestException, Inject, Patch } from "@nestjs/common";
import type { IProductService } from "@services/product/product.service.interface";
import { PRODUCT_SERVICE, USER_SERVICE } from "@common/constant/service.interface.constant";
import { PageFilterDto } from "@dto/page/page-filter.dto";
import { toReviewResponse } from "src/mapper/review.mapper";
import { PageResponseModel } from "@models/page/page-response.model";
import { ReviewResponse } from "@dto/review/review.response";
import type { IUserService } from "@services/user/user.service.interface";
import { ProductRatingSummaryResponse } from "@dto/review/productRatingSummary.response";
import { CreateReviewRequest } from "@dto/review/create-review.request";
import { UpdateReviewRequest } from "@dto/review/update-review.request";

export class ReviewService implements IReviewService{
    constructor(
        private readonly prismaService: PrismaService,
        @Inject(PRODUCT_SERVICE)
        private readonly productService: IProductService,
        @Inject(USER_SERVICE)
        private readonly userService: IUserService
    ){}

    async Add(data: CreateReviewRequest): Promise<ReviewResponse> {
        const product = await this.productService.GetById(data.productId);
        const user = await this.userService.GetUserByUserId(data.userId);
        const hasReviewed = await this.HasReviewed(user.id, product.id);

        if (hasReviewed) {
            throw new BadRequestException("User already reviewed this product");
        }

        const result = await this.prismaService.review.create({
            data: data,
        });

        return toReviewResponse(result);
    }

    async Update(id: number, data: UpdateReviewRequest): Promise<ReviewResponse> {
        await this.GetById(id);
        const result = await this.prismaService.review.update({
            where: { id },
            data: data
        });

        return toReviewResponse(result);
    }

    async SoftDelete(id: number): Promise<ReviewResponse> {
        await this.GetById(id);
        const result = await this.prismaService.review.update({
            where: { id },
            data: {
                isDeleted: true
            }
        });

        return toReviewResponse(result);
    }

    async Restore(id: number): Promise<ReviewResponse> {
        await this.GetById(id);
        const result = await this.prismaService.review.update({
            where: { id },
            data: {
                isDeleted: false
            }
        });

        return toReviewResponse(result);
    }

    async Delete(id: number): Promise<any> {
        await this.GetById(id);
        return await this.prismaService.review.delete({ where: { id }})
    }

    async GetById(id: number): Promise<ReviewResponse> {
        const review = await this.prismaService.review.findUnique({
            where: { id }
        });

        if (!review) {
            throw new BadRequestException("Review not found");
        }

        return toReviewResponse(review);
    }

    async GetReviewsByProduct(productId: number, filter: PageFilterDto): Promise<PageResponseModel<ReviewResponse>> {
        const product = await this.productService.GetById(productId);
        filter.normalize();

        const skip = (filter.page-1)*filter.limit;
        const review = await this.prismaService.review.findMany({
            where: {
                productId: productId,
                isDeleted: false
            },
            skip: skip,
            take: filter.limit

        });

        const totalItems = await this.prismaService.review.count({
            where: {
                productId: productId, 
                isDeleted: false,
            }
        });

        const totalPages = Math.ceil(totalItems/filter.limit);

        return {
            content: review.map(toReviewResponse),
            totalItems,
            totalPages,
            pageNumber: filter.page,
            pageSize: filter.limit,
        }
    }

    async GetReviewsByUser(userId: number, filter: PageFilterDto): Promise<PageResponseModel<ReviewResponse>> {
        const user = await this.userService.GetUserByUserId(userId);
        filter.normalize();

        const skip = (filter.page-1)*filter.limit;
        const review = await this.prismaService.review.findMany({
            where: {
                userId: userId,
                isDeleted: false
            },
            skip: skip,
            take: filter.limit

        });

        const totalItems = await this.prismaService.review.count({
            where: {
                userId: userId, 
                isDeleted: false,
            }
        });

        const totalPages = Math.ceil(totalItems/filter.limit);

        return {
            content: review.map(toReviewResponse),
            totalItems,
            totalPages,
            pageNumber: filter.page,
            pageSize: filter.limit,
        }
    }

    async HasReviewed(userId: number, productId: number): Promise<boolean> {
        const result = await this.prismaService.review.findFirst({
            where: {
                userId: userId,
                productId: productId
            }
        });
        
        if (result) {
            return true;
        }

        return false;
    }

    async GetAverageRating(productId: number): Promise<ProductRatingSummaryResponse> {
        const result = await this.prismaService.review.aggregate({
            where: { productId, isDeleted: false},
            _avg: { rating: true },
            _count: { rating: true }
        });

        return {
            averageRating: result._avg.rating ?? 0,
            totalReviews: result._count.rating ?? 0
        }
    }

    async GetReviewCount(productId: number): Promise<number> {
        await this.productService.GetById(productId);
        return await this.prismaService.review.count({
            where: { 
                productId: productId,
                isDeleted: false
            }
        });
    }
}