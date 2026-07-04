import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminRulesController } from './admin-rules.controller';
import { AdminRulesRepository } from './admin-rules.repository';
import { AdminRulesService } from './admin-rules.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminRulesController],
  providers: [AdminRulesService, AdminRulesRepository],
})
export class AdminModule {}
