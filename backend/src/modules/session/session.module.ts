import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { SessionEventService } from './session-event.service';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';

@Module({
  imports: [RedisModule],
  controllers: [SessionController],
  providers: [SessionService, SessionEventService],
  exports: [SessionService, SessionEventService],
})
export class SessionModule {}
