import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class AddToCartDto {
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  variantId: number;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  quantity: number;
}