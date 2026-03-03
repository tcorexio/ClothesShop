import { CATEGORY_SERVICE, PRODUCT_SERVICE } from "@common/constant/service.interface.constant";
import { ProductController } from "@controllers/product.controller";
import { CategoryModule } from "@modules/category/category.module";
import { PrismaModule } from "@modules/prisma/prisma.module";
import { Module } from "@nestjs/common";
import { ProductService } from "@services/product/product.service";

@Module({
    imports: [
        PrismaModule,
        CategoryModule
    ],
    controllers: [ProductController],
    providers: [{
        provide: PRODUCT_SERVICE,
        useClass: ProductService,
    }],
    exports: [PRODUCT_SERVICE],
})
export class ProductModule{}