import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    Inject,
    ParseIntPipe,
    Req,
} from "@nestjs/common";
import type { IOrderService } from "@services/order/order.service.interface";
import { CreateOrderDto } from "@dto/order/create-order.dto";
import { UpdateOrderStatusDto } from "@dto/order/update-order-status.dto";
import { FilterOrdersDto } from "@dto/order/filter-orders.dto";
import { CancelOrderDto } from "@dto/order/cancel-order.dto";

@Controller("orders")
export class OrderController {
    constructor(
        @Inject("ORDER_SERVICE")
        private readonly orderService: IOrderService,
    ) { }

    // GET ALL ORDERS (Admin)
    @Get()
    getAllOrders(@Query() filter: FilterOrdersDto) {
        return this.orderService.getAllOrders(filter);
    }

    // CREATE ORDER
    @Post()
    createOrder(@Body() dto: CreateOrderDto) {
        return this.orderService.createOrder(dto.userId, dto);
    }

    // GET USER ORDERS
    @Get("user/:userId")
    getUserOrders(
        @Param("userId", ParseIntPipe) userId: number,
        @Query() filter: FilterOrdersDto,
    ) {
        return this.orderService.getUserOrders(userId, filter);
    }

    // GET ORDER DETAIL
    @Get(":id")
    getOrderById(
        @Param("id", ParseIntPipe) id: number,
        @Query("userId", ParseIntPipe) userId: number,
    ) {
        return this.orderService.getOrderById(id, userId);
    }

    // UPDATE ORDER STATUS (Admin)
    @Patch(":id/status")
    updateOrderStatus(
        @Param("id", ParseIntPipe) id: number,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        return this.orderService.updateOrderStatus(id, dto);
    }

    // CANCEL ORDER
    @Patch(":id/cancel")
    cancelOrder(
        @Param("id", ParseIntPipe) id: number,
        @Body() dto: CancelOrderDto,
    ) {
        return this.orderService.cancelOrder(id, dto.userId, dto);
    }
}
