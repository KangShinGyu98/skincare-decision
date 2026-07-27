import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SessionModule } from '../session/session.module';
import { UserResponsesModule } from '../user-responses/user-responses.module';
import { PriorityGateController } from './priority-gate.controller';
import { PriorityGateRepository } from './priority-gate.repository';
import { PriorityGateService } from './priority-gate.service';

@Module({
  imports: [PrismaModule, SessionModule, UserResponsesModule],
  controllers: [PriorityGateController],
  providers: [PriorityGateService, PriorityGateRepository],
  exports: [PriorityGateService],
})
export class PriorityGateModule {}
