import { IsEnum, IsInt, IsPositive } from 'class-validator';
import { PaymentMethod } from 'generated/prisma/enums';

export class CreateOrderDto {
    @IsInt()
    @IsPositive()
    userId: number;

    @IsInt()
    @IsPositive()
    addressId: number;

    @IsEnum(PaymentMethod, {
        message: "Payment method must be either COD or BANK TRANSFER",
    })
    paymentMethod: PaymentMethod;
}