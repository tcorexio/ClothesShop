import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { OrderStatus } from "generated/prisma/enums";

export class UpdateOrderStatusDto {
    @IsEnum(OrderStatus, {
        message: "Status must be a valid order status",
    })
    status: OrderStatus;

    @IsOptional()
    @IsString()
    @MaxLength(200, {
        message: "Note must not exceed 200 characters"
    })
    note?: string;
}