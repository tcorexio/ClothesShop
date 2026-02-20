import { IsOptional, IsEnum, IsDateString, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { PaymentStatus } from "@prisma/client";

export class FilterPaymentsDto {
    @IsOptional()
    @IsEnum(PaymentStatus)
    status?: PaymentStatus;

    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @IsOptional()
    @IsDateString()
    toDate?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;
}