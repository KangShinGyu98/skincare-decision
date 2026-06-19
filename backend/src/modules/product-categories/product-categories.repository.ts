import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export type ProductCategoryRepositoryItem = {
  id: string;
  key: string;
  name: string;
  description: string | null;
};

@Injectable()
export class ProductCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ProductCategoryRepositoryItem[]> {
    return this.prisma.productCategory.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
      },
      orderBy: {
        key: 'asc',
      },
    });
  }
}
