import { Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { REVIEW_SERVICE } from "@common/constant/service.interface.constant";
import type { IReviewService } from "@services/review/review.service.interface";
import { CreateReviewRequest } from "@dto/review/create-review.request";
import { UpdateReviewRequest } from "@dto/review/update-review.request";
import { Roles } from "@common/decorators/roles.decorator";
import { ROLE } from "generated/prisma/enums";
import { Public } from "@common/decorators/public.decorator";
import { PageFilterDto } from "@dto/page/page-filter.dto";

@Controller("reviews")
export class ReviewController {
    constructor(
        @Inject(REVIEW_SERVICE)
        private readonly reviewService: IReviewService,
    ){}

    @Post()
    async create(@Body() dto: CreateReviewRequest, ) {
        const review = await this.reviewService.Add(dto);
        return {
            message: 'Review created successfully',
            data: review,
        };
    }

    @Patch(':id')
    async update(
        @Body() dto: UpdateReviewRequest, 
        @Param('id') id: number,
    ) {
        const review = await this.reviewService.Update(id, dto);
        return {
            message: 'Review updated successfully',
            data: review,
        };
    }

    @Delete(':id')
    async softDelete(@Param('id') id: number) {
        const review = await this.reviewService.SoftDelete(id);
        return {
            message: 'Review deleted successfully',
            data: review,
        };
    }

    @Post(':id/restore')
    @Roles(ROLE.ADMIN)
    async restore(@Param('id') id: number) {
        const review = await this.reviewService.Restore(id);
        return {
            message: 'Review restored successfully',
            data: review,
        };
    }


    @Get(':id')
    async getById(@Param('id') id: number) {
        const review = await this.reviewService.GetById(id);
        return {
            message: 'Review retrieved successfully',
            data: review,
        }; 
    }

    @Get('product/:productId')
    @Public()
    async getReviewsByProduct(
        @Param('productId') productId: number, 
        @Query() filter: PageFilterDto
    ) {
        const review = await this.reviewService.GetReviewsByProduct(productId, filter);
        return {
            message: 'Reviews retrieved successfully',
            data: review,
        };
    }

    @Get('user/:userId')
    @Public()
    async getReviewsByUser(
        @Param('userId') userId: number, 
        @Query() filter: PageFilterDto
    ) {
        const review = await this.reviewService.GetReviewsByUser(userId, filter);
        return {
            message: 'Reviews retrieved successfully',
            data: review,
        };
    }

    @Get('has-reviewed')
    async hasReviewed(
        @Query('userId') userId: number,
        @Query('productId') productId: number
    ) {
        const result = await this.reviewService.HasReviewed(userId, productId);

        return {
            message: 'Checked successfully',
            data: result,
        };
    }

    @Get('product/:productId/rating-summary')
    @Public()
    async getAverageRating(
        @Param('productId') productId: number,
    ) {
        const result = await this.reviewService.GetAverageRating(productId);

        return {
            message: 'Rating summary retrieved successfully',
            data: result,
        };
    }

    @Get('product/:productId/count')
    @Public()
    async getReviewCount(
        @Param('productId') productId: number,
    ) {
        const result = await this.reviewService.GetReviewCount(productId);

        return {
            message: 'Review count retrieved successfully',
            data: result,
        };
    }
}