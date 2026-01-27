export interface CartItemModel {
  id: number;
  cartId: number;
  variantId: number;
  quantity: number;
  
  // Thông tin variant để hiển thị
  variant?: {
    id: number;
    size: string;
    color: string;
    price: number;
    imageUrl: string | null;
    stock: number;
    product: {
      id: number;
      name: string;
      description: string | null;
    };
  };
}