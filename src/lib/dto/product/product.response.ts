import { Decimal } from "generated/prisma/internal/prismaNamespace";

export interface ProductResponse {
    id: number;
    name: string;
    description: string | null;   
    price: number;
    categoryId: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date | null;
}