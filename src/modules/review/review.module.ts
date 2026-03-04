import { REVIEW_SERVICE } from "@common/constant/service.interface.constant";
import { ReviewController } from "@controllers/review.controller";
import { PrismaModule } from "@modules/prisma/prisma.module";
import { ProductModule } from "@modules/product/product.module";
import { UserModule } from "@modules/user/user.module";
import { Module } from "@nestjs/common";
import { ReviewService } from "@services/review/review.service";

@Module({
    imports: [
        PrismaModule,
        ProductModule,
        UserModule,
    ],
    controllers: [ReviewController],
    providers: [{
        provide: REVIEW_SERVICE,
        useClass: ReviewService,
    }]
})
export class ReviewModule {
}