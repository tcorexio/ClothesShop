import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { CART_SERVICE } from '@common/constant/service.interface.constant';
import type { ICartService } from '@services/cart/cart.service.interface';
import { AddToCartDto } from '@dto/cart/add-to-cart.dto';
import { UpdateCartItemDto } from '@dto/cart/update-cart-item.dto';
import type { Request } from 'express';
import { AuthUser } from '@dto/auth/auth-user.interface';

@Controller('cart')
export class CartController {
  constructor(
    @Inject(CART_SERVICE)
    private readonly cartService: ICartService,
  ) {}
  
  @Post()
  addToCart(
    @Body() dto: AddToCartDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.cartService.AddToCart(req.user.id, dto);
  }

  @Get()
  getCart(@Req() req: Request & { user: AuthUser }) {
    return this.cartService.GetCart(req.user.id);
  }

  @Put('items/:id')
  updateCartItem(
    @Param('id', ParseIntPipe) cartItemId: number,
    @Body() dto: UpdateCartItemDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.cartService.UpdateCartItem(req.user.id, cartItemId, dto);
  }

  @Delete('items/:id')
  removeCartItem(
    @Param('id', ParseIntPipe) cartItemId: number,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.cartService.RemoveCartItem(req.user.id, cartItemId);
  }

  @Delete()
  clearCart(@Req() req: Request & { user: AuthUser }) {
    return this.cartService.ClearCart(req.user.id);
  }
}