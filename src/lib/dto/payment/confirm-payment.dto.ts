import { IsInt, IsPositive, IsOptional, IsString } from "class-validator";

export class ConfirmPaymentDto {
    @IsInt()
    @IsPositive()
    paymentId: number;

    @IsOptional()
    @IsString()
    transactionId?: string;
}