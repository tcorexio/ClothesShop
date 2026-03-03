import { PageFilterDto } from "@dto/page/page-filter.dto";
import { IsOptional, IsString } from "class-validator";

export class ProductVariantFilterRequest extends PageFilterDto {
    @IsOptional()
    @IsString()
    size?: string;
    
    @IsOptional()
    @IsString()
    color?: string;

}