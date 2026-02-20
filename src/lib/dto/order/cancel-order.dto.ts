import { IsString, IsNotEmpty, MinLength, MaxLength } from "class-validator";

export class CancelOrderDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(10, {
        message: "Reason must be at least 10 characters",
    })
    @MaxLength(200, {
        message: "Reason must not exceed 200 characters",
    })
    reason: string;
}