import { Controller, Get } from '@nestjs/common';
import type { ProductCategoriesResponseDto } from '@skincare-decision/shared/schemas';
import { Public } from 'src/common/decorators/auth.decorator';
import { ProductCategoriesService } from './product-categories.service';

@Public()
@Controller('product-categories')
export class ProductCategoriesController {
  constructor(private readonly service: ProductCategoriesService) {}

  @Get()
  findAll(): Promise<ProductCategoriesResponseDto> {
    return this.service.findAll();
  }
}
