import { IsInt, isInt, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, Min } from "class-validator";

export class UpdateProductVariantRequest {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    @IsOptional()
    size?: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    @IsOptional()
    color?: string;

    @IsInt()
    @IsNotEmpty()
    @Min(0)
    @IsOptional()   
    stock?: number;
}