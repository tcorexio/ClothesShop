export class ReviewResponse {
    id : number;
    userId: number;
    productId: number;
    rating: number;
    comment: string | null;
    createdAt: Date;
}