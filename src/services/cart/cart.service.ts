import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@services/prisma/prisma.service';
import { ICartService } from './cart.service.interface';
import { AddToCartDto } from '@dto/cart/add-to-cart.dto';
import { UpdateCartItemDto } from '@dto/cart/update-cart-item.dto';
import { CartModel } from '@models/cart/cart.model';
import { CartItemModel } from '@models/cart/cart-item.model';
// import { Decimal } from 'generated/prisma/runtime/library';

@Injectable()
export class CartService implements ICartService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy hoặc tạo cart cho user
   */
  async GetOrCreateCart(userId: number): Promise<{ id: number }> {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        select: { id: true },
      });
    }

    return cart;
  }

  /**
   * Thêm sản phẩm vào giỏ hàng
   */
  async AddToCart(userId: number, dto: AddToCartDto): Promise<CartItemModel> {
    try {
      // 1. Kiểm tra variant có tồn tại không
      const variant = await this.prisma.productVariant.findFirst({
        where: {
          id: dto.variantId,
          isDeleted: false,
          product: {
            isDeleted: false,
            isActive: true,
          },
        },
        include: {
          product: true,
        },
      });

      if (!variant) {
        throw new NotFoundException('Sản phẩm không tồn tại hoặc đã ngừng bán');
      }

      // 2. Kiểm tra số lượng tồn kho
      if (variant.stock < dto.quantity) {
        throw new BadRequestException(
          `Chỉ còn ${variant.stock} sản phẩm trong kho`,
        );
      }

      // 3. Lấy hoặc tạo cart
      const cart = await this.GetOrCreateCart(userId);

      // 4. Kiểm tra sản phẩm đã có trong giỏ chưa
      const existingItem = await this.prisma.cartItem.findUnique({
        where: {
          cartId_variantId: {
            cartId: cart.id,
            variantId: dto.variantId,
          },
        },
      });

      let cartItem;

      if (existingItem) {
        // Sản phẩm đã có → tăng số lượng
        const newQuantity = existingItem.quantity + dto.quantity;

        if (variant.stock < newQuantity) {
          throw new BadRequestException(
            `Chỉ còn ${variant.stock} sản phẩm trong kho`,
          );
        }

        cartItem = await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQuantity },
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        });
      } else {
        // Sản phẩm chưa có → thêm mới
        cartItem = await this.prisma.cartItem.create({
          data: {
            cartId: cart.id,
            variantId: dto.variantId,
            quantity: dto.quantity,
          },
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        });
      }

      return this.mapToCartItemModel(cartItem);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể thêm vào giỏ hàng');
    }
  }

  /**
   * Xem giỏ hàng
   */
  async GetCart(userId: number): Promise<CartModel> {
    try {
      const cart = await this.GetOrCreateCart(userId);

      const cartWithItems = await this.prisma.cart.findUnique({
        where: { id: cart.id },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

      if (!cartWithItems) {
        throw new NotFoundException('Giỏ hàng không tồn tại');
      }

      // Tính tổng tiền và tổng số lượng
    //   let totalPrice = new Decimal(0);
    //   let totalItems = 0;

    //   const items = cartWithItems.items.map((item) => {
    //     const itemPrice = new Decimal(item.variant.product.price).mul(
    //       item.quantity,
    //     );
    //     totalPrice = totalPrice.add(itemPrice);
    //     totalItems += item.quantity;

    //     return this.mapToCartItemModel(item);
    //   });

    //   return {
    //     id: cartWithItems.id,
    //     userId: cartWithItems.userId,
    //     items,
    //     totalPrice: totalPrice.toNumber(),
    //     totalItems,
    //   };
    let totalPrice = 0;
    let totalItems = 0;

    const items = cartWithItems.items.map((item) => {
        const itemPrice = Number(item.variant.product.price) * item.quantity;
        totalPrice += itemPrice;
        totalItems += item.quantity;

        return this.mapToCartItemModel(item);
    });

    return {
        id: cartWithItems.id,
        userId: cartWithItems.userId,
        items,
        totalPrice,
        totalItems,
    };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể lấy giỏ hàng');
    }
  }

  /**
   * Cập nhật số lượng sản phẩm trong giỏ
   */
  async UpdateCartItem(
    userId: number,
    cartItemId: number,
    dto: UpdateCartItemDto,
  ): Promise<CartItemModel> {
    try {
      // 1. Lấy cart của user
      const cart = await this.GetOrCreateCart(userId);

      // 2. Kiểm tra cart item có thuộc về user không
      const cartItem = await this.prisma.cartItem.findFirst({
        where: {
          id: cartItemId,
          cartId: cart.id,
        },
        include: {
          variant: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!cartItem) {
        throw new NotFoundException('Sản phẩm không có trong giỏ hàng');
      }

      // 3. Kiểm tra số lượng tồn kho
      if (cartItem.variant.stock < dto.quantity) {
        throw new BadRequestException(
          `Chỉ còn ${cartItem.variant.stock} sản phẩm trong kho`,
        );
      }

      // 4. Cập nhật số lượng
      const updatedItem = await this.prisma.cartItem.update({
        where: { id: cartItemId },
        data: { quantity: dto.quantity },
        include: {
          variant: {
            include: {
              product: true,
            },
          },
        },
      });

      return this.mapToCartItemModel(updatedItem);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không thể cập nhật giỏ hàng',
      );
    }
  }

  /**
   * Xóa sản phẩm khỏi giỏ hàng
   */
  async RemoveCartItem(
    userId: number,
    cartItemId: number,
  ): Promise<boolean> {
    try {
      // 1. Lấy cart của user
      const cart = await this.GetOrCreateCart(userId);

      // 2. Kiểm tra cart item có thuộc về user không
      const cartItem = await this.prisma.cartItem.findFirst({
        where: {
          id: cartItemId,
          cartId: cart.id,
        },
      });

      if (!cartItem) {
        throw new NotFoundException('Sản phẩm không có trong giỏ hàng');
      }

      // 3. Xóa cart item
      await this.prisma.cartItem.delete({
        where: { id: cartItemId },
      });

      return true;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không thể xóa sản phẩm khỏi giỏ hàng',
      );
    }
  }

  /**
   * Xóa toàn bộ giỏ hàng
   */
  async ClearCart(userId: number): Promise<boolean> {
    try {
      const cart = await this.GetOrCreateCart(userId);

      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return true;
    } catch (error) {
      throw new InternalServerErrorException('Không thể xóa giỏ hàng');
    }
  }

  /**
   * Helper: Map Prisma CartItem to CartItemModel
   */
  private mapToCartItemModel(item: any): CartItemModel {
    return {
      id: item.id,
      cartId: item.cartId,
      variantId: item.variantId,
      quantity: item.quantity,
      variant: item.variant
        ? {
            id: item.variant.id,
            size: item.variant.size,
            color: item.variant.color,
            price: item.variant.product.price.toNumber(),
            imageUrl: item.variant.imageUrl,
            stock: item.variant.stock,
            product: {
              id: item.variant.product.id,
              name: item.variant.product.name,
              description: item.variant.product.description,
            },
          }
        : undefined,
    };
  }
}