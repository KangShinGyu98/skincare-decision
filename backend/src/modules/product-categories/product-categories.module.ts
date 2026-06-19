import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductCategoriesRepository } from './product-categories.repository';
import { ProductCategoriesService } from './product-categories.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductCategoriesController],
  providers: [ProductCategoriesService, ProductCategoriesRepository],
})
export class ProductCategoriesModule {}
