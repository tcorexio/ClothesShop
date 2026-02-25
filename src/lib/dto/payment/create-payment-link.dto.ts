import { IsInt, IsPositive } from "class-validator";

export class CreatePaymentLinkDto {
    @IsInt()
    @IsPositive()
    orderId: number;
}