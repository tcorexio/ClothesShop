import { StatisticFilterDto } from '@dto/statistic/statistic-filter.dto';

// Revenue summary for DELIVERED orders only
export interface RevenueStats {
    totalRevenue: number;
    totalDeliveredOrders: number;
    averageOrderValue: number;
}

// Order count grouped by each status
export interface OrderStats {
    totalOrders: number;
    countByStatus: Record<string, number>;
}

export interface TopProduct {
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
}

export interface IStatisticService {
    // Returns total revenue, number of DELIVERED orders, and average order value
    getRevenueStats(filter: StatisticFilterDto): Promise<RevenueStats>;

    // Returns total order count and a breakdown by each status
    getOrderStats(filter: StatisticFilterDto): Promise<OrderStats>;

    // Returns products sorted by quantity sold (descending)
    getTopSellingProducts(filter: StatisticFilterDto): Promise<{ topProducts: TopProduct[] }>;
}
