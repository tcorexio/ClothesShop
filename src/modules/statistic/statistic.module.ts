import { Module } from '@nestjs/common';
import { StatisticController } from '@controllers/statistic.controller';
import { StatisticService } from '@services/statistic/statistic.service';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { STATISTIC_SERVICE } from '@common/constant/service.interface.constant';

@Module({
    imports: [PrismaModule],
    controllers: [StatisticController],
    providers: [
        {
            provide: STATISTIC_SERVICE,
            useClass: StatisticService,
        },
    ],
})
export class StatisticModule { }
