import { IsNotEmpty, IsString } from "class-validator";

export class UpdateCategoryRequest {
    @IsString()
    @IsNotEmpty()
    title: string;
}