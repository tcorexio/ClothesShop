import { ProductResponse } from "@dto/product/product.response";

export const toProductResponse = (product: any): ProductResponse => {

    return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price.toNumber(),
        categoryId: product.categoryId,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
    };
}