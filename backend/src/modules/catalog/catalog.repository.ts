// Repository layer for catalog-domain persistence operations.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}
}
