import { ProductVariantResponse } from "@dto/product-variant/product-variant.response";
import { ProductVariant } from "generated/prisma/client";

export const toProductVariantResponse = (variant: ProductVariant): ProductVariantResponse => {
    return {
        id: variant.id,
        productId: variant.productId,
        size: variant.size,
        color: variant.color,
        stock: variant.stock,
        createdAt: variant.createdAt,
        updatedAt: variant.updatedAt,
        imageUrl: variant.imageUrl,
    };
}