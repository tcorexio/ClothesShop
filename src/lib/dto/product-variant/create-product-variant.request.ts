import { Type } from "class-transformer";
import { IsInt, isInt, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, Min } from "class-validator";

export class CreateProductVariantRequest {
    @IsInt()
    @Type(() => Number)
    @IsNotEmpty()
    productId: number;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    size: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    color: string;

    @IsInt()
    @Type(() => Number)
    @IsNotEmpty()
    @Min(0)
    stock: number;
}