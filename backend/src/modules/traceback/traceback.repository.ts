// Repository layer for traceback-domain persistence operations.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma.service';

@Injectable()
export class TracebackRepository {
  constructor(private readonly prisma: PrismaService) {}
}
