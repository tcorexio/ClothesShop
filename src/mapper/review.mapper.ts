import { ReviewResponse } from "@dto/review/review.response";
import { Review } from "generated/prisma/client";

export const toReviewResponse = (review: Review): ReviewResponse => {
    return {
        id: review.id,
        userId: review.userId,
        productId: review.productId,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt
    }
}