import { IsEnum, IsInt, IsPositive } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateOrderDto {
    @IsInt()
    @IsPositive()
    addressId: number;

    @IsEnum(PaymentMethod, {
        message: "Payment method must be either COD or BANK TRANSFER",
    })
    paymentMethod: PaymentMethod;
}