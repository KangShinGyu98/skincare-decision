import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminQuestionsController } from './admin-questions.controller';
import { AdminQuestionsRepository } from './admin-questions.repository';
import { AdminQuestionsService } from './admin-questions.service';
import { AdminRulesController } from './admin-rules.controller';
import { AdminRulesRepository } from './admin-rules.repository';
import { AdminRulesService } from './admin-rules.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminRulesController, AdminQuestionsController],
  providers: [
    AdminRulesService,
    AdminRulesRepository,
    AdminQuestionsService,
    AdminQuestionsRepository,
  ],
})
export class AdminModule {}
