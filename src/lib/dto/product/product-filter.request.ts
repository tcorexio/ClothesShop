import { PageFilterDto } from "@dto/page/page-filter.dto";
import { IsOptional, IsString } from "class-validator";

export class ProductFilterRequest extends PageFilterDto{
    @IsOptional()
    @IsString()
    keyword?: string;
}