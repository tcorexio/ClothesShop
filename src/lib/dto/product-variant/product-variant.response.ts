export interface ProductVariantResponse {
    id: number;
    productId: number;
    size: string;
    color: string;
    stock: number;
    imageUrl: string | null;
    createdAt: Date;
    updatedAt: Date | null;
}