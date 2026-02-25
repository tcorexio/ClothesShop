import { AddToCartDto } from '@dto/cart/add-to-cart.dto';
import { UpdateCartItemDto } from '@dto/cart/update-cart-item.dto';
import { CartModel } from '@models/cart/cart.model';
import { CartItemModel } from '@models/cart/cart-item.model';

export interface ICartService { 
  AddToCart(userId: number, dto: AddToCartDto): Promise<CartItemModel>;
  GetCart(userId: number): Promise<CartModel>;
  UpdateCartItem(
    userId: number,
    cartItemId: number,
    dto: UpdateCartItemDto,
  ): Promise<CartItemModel>;
  RemoveCartItem(userId: number, cartItemId: number): Promise<boolean>;
  ClearCart(userId: number): Promise<boolean>;
  GetOrCreateCart(userId: number): Promise<{ id: number }>;
}