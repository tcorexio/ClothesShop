import { CATEGORY_SERVICE } from "@common/constant/service.interface.constant";
import { CategoryController } from "@controllers/category.controller";
import { PrismaModule } from "@modules/prisma/prisma.module";
import { Module } from "@nestjs/common";
import { CategoryService } from "@services/category/category.service";

@Module({
    imports: [PrismaModule],
    controllers: [CategoryController],
    providers: [{
        provide: CATEGORY_SERVICE,
        useClass: CategoryService,
    }],
    exports: [CATEGORY_SERVICE],
})
export class CategoryModule{}