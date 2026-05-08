// Repository layer for matrix-domain persistence operations.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';

@Injectable()
export class MatrixRepository {
  constructor(private readonly prisma: PrismaService) {}
}
