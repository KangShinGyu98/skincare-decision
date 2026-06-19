import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SessionModule } from '../session/session.module';
import { UserResponsesModule } from '../user-responses/user-responses.module';
import { LandingConcernSelectionsController } from './landing-concern-selections.controller';
import { LandingConcernSelectionsRepository } from './landing-concern-selections.repository';
import { LandingConcernSelectionsService } from './landing-concern-selections.service';

@Module({
  imports: [PrismaModule, SessionModule, UserResponsesModule],
  controllers: [LandingConcernSelectionsController],
  providers: [LandingConcernSelectionsService, LandingConcernSelectionsRepository],
})
export class LandingModule {}
