import { ProductResponse } from '@dto/product/product.response';

export const toProductResponse = (product: any): ProductResponse => {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    // Keep price as decimal string to maintain precision in response
    // Client should parse as fixed-point decimal with 2 places
    price: parseFloat(product.price.toString()),
    categoryId: product.categoryId,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};
