import { PRODUCT_VARIANT_SERVICE } from "@common/constant/service.interface.constant";
import { ProductVariantController } from "@controllers/product-variant.controller";
import { PrismaModule } from "@modules/prisma/prisma.module";
import { ProductModule } from "@modules/product/product.module";
import { S3Module } from "@modules/s3/s3.module";
import { Module } from "@nestjs/common";
import { ProductVariantService } from "@services/product-variant/product-variant.service";
import { S3Service } from "@services/s3/s3.service";

@Module({
    imports: [
        PrismaModule,
        ProductModule,
        S3Module,
    ],
    controllers: [ProductVariantController],
    providers: [{
        provide: PRODUCT_VARIANT_SERVICE,
        useClass: ProductVariantService,
    }],
    exports: [PRODUCT_VARIANT_SERVICE],
})
export class ProductVariantModule {}