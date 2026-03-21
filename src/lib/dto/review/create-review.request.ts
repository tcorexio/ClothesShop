import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateReviewRequest {
    @IsInt()
    @Type(() => Number)
    @IsNotEmpty()
    userId: number;

    @IsInt()
    @Type(() => Number)
    @IsNotEmpty()
    productId: number;

    @IsInt()
    @Type(() => Number)
    @Min(1)
    @Max(5)
    @IsNotEmpty()
    rating: number;

    @IsString()
    @MaxLength(200)
    @IsOptional()
    comment?: string;
}