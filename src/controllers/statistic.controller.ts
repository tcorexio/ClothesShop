import { Controller, Get, Query, Inject } from '@nestjs/common';
import { STATISTIC_SERVICE } from '@common/constant/service.interface.constant';
import type { IStatisticService } from '@services/statistic/statistic.service.interface';
import { StatisticFilterDto } from '@dto/statistic/statistic-filter.dto';

@Controller('statistics')
export class StatisticController {
    constructor(
        @Inject(STATISTIC_SERVICE)
        private readonly statisticService: IStatisticService,
    ) { }

    @Get('revenue')
    getRevenueStats(@Query() filter: StatisticFilterDto) {
        return this.statisticService.getRevenueStats(filter);
    }

    @Get('orders')
    getOrderStats(@Query() filter: StatisticFilterDto) {
        return this.statisticService.getOrderStats(filter);
    }

    @Get('top-products')
    getTopSellingProducts(@Query() filter: StatisticFilterDto) {
        return this.statisticService.getTopSellingProducts(filter);
    }
}
