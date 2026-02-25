import { IsString, IsNumber, IsOptional, IsBoolean, IsObject } from "class-validator";
import { Type } from "class-transformer";

// DTO for webhook data from PayOS
class PayOSWebhookDataDto {
    @IsNumber()
    orderCode: number;

    @IsNumber()
    amount: number;

    @IsString()
    description: string;

    @IsString()
    accountNumber: string;

    @IsString()
    reference: string;

    @IsString()
    transactionDateTime: string;

    @IsString()
    currency: string;

    @IsString()
    paymentLinkId: string;

    @IsString()
    code: string;

    @IsString()
    desc: string;

    @IsOptional()
    @IsString()
    counterAccountBankId?: string;

    @IsOptional()
    @IsString()
    counterAccountBankName?: string;

    @IsOptional()
    @IsString()
    counterAccountName?: string;

    @IsOptional()
    @IsString()
    counterAccountNumber?: string;

    @IsOptional()
    @IsString()
    virtualAccountName?: string;

    @IsOptional()
    @IsString()
    virtualAccountNumber?: string;
}

// DTO for webhook body from PayOS
export class PayOSWebhookDto {
    @IsString()
    code: string;

    @IsString()
    desc: string;

    @IsBoolean()
    success: boolean;

    @IsObject()
    @Type(() => PayOSWebhookDataDto)
    data: PayOSWebhookDataDto;

    @IsString()
    signature: string;
}