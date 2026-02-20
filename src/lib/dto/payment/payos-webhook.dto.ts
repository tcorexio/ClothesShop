import { IsString, IsNumber, IsOptional } from "class-validator";

export class PayOSWebhookDto {
    @IsString()
    code: string;

    @IsNumber()
    orderCode: number;

    @IsNumber()
    amount: number;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    transactionDateTime: string;

    @IsString()
    reference: string;
}