import { Module } from '@nestjs/common';
import { UserResponsesService } from './user-responses.service';

@Module({
  providers: [UserResponsesService],
  exports: [UserResponsesService],
})
export class UserResponsesModule {}
