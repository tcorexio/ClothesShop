import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdateProductRequest {
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    name?: string;

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    description?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    price?: number;

    @IsInt()
    @IsOptional()
    categoryId?: number;
}