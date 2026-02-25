import { CartItemModel } from './cart-item.model';

export interface CartModel {
  id: number;
  userId: number;
  items: CartItemModel[];
  totalPrice: number; // Tạm tính tiền
  totalItems: number; // Tổng số sản phẩm
}