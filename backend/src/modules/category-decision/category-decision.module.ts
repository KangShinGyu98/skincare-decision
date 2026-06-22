import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SessionModule } from '../session/session.module';
import { UserResponsesModule } from '../user-responses/user-responses.module';
import { CategoryDecisionController } from './category-decision.controller';
import { CategoryDecisionRepository } from './category-decision.repository';
import { CategoryDecisionService } from './category-decision.service';

@Module({
  imports: [PrismaModule, SessionModule, UserResponsesModule],
  controllers: [CategoryDecisionController],
  providers: [CategoryDecisionService, CategoryDecisionRepository],
})
export class CategoryDecisionModule {}
