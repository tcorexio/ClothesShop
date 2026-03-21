import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class UpdateReviewRequest {
    @IsInt()
    @Type(() => Number)
    @Min(1)
    @Max(5)
    @IsOptional()
    rating?: number;

    @IsString()
    @MaxLength(200)
    @IsOptional()
    comment?: string;
}