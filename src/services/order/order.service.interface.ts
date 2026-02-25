import { CreateOrderDto } from "@dto/order/create-order.dto";
import { UpdateOrderStatusDto } from "@dto/order/update-order-status.dto";
import { FilterOrdersDto } from "@dto/order/filter-orders.dto";
import { CancelOrderDto } from "@dto/order/cancel-order.dto";

export interface IOrderService {
    createOrder(
        userId: number,
        dto: CreateOrderDto
    ): Promise<any>;

    getUserOrders(
        userId: number,
        filter: FilterOrdersDto
    ): Promise<any>;

    getOrderById(
        orderId: number,
        userId: number
    ): Promise<any>;

    updateOrderStatus(
        orderId: number,
        dto: UpdateOrderStatusDto
    ): Promise<any>;

    cancelOrder(
        orderId: number,
        userId: number,
        dto: CancelOrderDto
    ): Promise<any>;

    getAllOrders(filter: FilterOrdersDto): Promise<any>;
}