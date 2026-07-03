import { Injectable } from '@nestjs/common';
import type { ProductCategoriesResponseDto } from '@skincare-decision/shared/schemas';
import { ProductCategoriesRepository } from './product-categories.repository';

@Injectable()
export class ProductCategoriesService {
  constructor(private readonly repository: ProductCategoriesRepository) {}

  async findAll(): Promise<ProductCategoriesResponseDto> {
    const categories = await this.repository.findAll();

    return {
      items: categories.map((category) => ({
        id: category.id,
        key: category.key,
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
      })),
    };
  }
}
