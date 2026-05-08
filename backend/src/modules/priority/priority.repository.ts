// Repository layer for priority-domain persistence operations.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';

@Injectable()
export class PriorityRepository {
  constructor(private readonly prisma: PrismaService) {}
}
