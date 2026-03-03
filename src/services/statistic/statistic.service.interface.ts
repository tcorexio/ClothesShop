import { StatisticFilterDto } from '@dto/statistic/statistic-filter.dto';

export interface IStatisticService {
    // Returns total revenue, number of DELIVERED orders, and average order value
    getRevenueStats(filter: StatisticFilterDto): Promise<any>;

    // Returns total order count and a breakdown by each status
    getOrderStats(filter: StatisticFilterDto): Promise<any>;

    // Returns products sorted by quantity sold (descending)
    getTopSellingProducts(filter: StatisticFilterDto): Promise<any>;
}
