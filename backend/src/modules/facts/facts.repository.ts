// Repository layer for facts-domain persistence operations.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';

@Injectable()
export class FactsRepository {
  constructor(private readonly prisma: PrismaService) {}
}
