import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { RequestWithContext } from '../types/express-request.type';

/**
 * DeviceSessionGuard는 request.context에 deviceId와 sessionId가 존재하는지 확인하는 가드입니다.
 */
@Injectable()
export class DeviceSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    if (!request.context.deviceId || !request.context.sessionId) {
      throw new InternalServerErrorException('Device/session context is not initialized');
    }

    return true;
  }
}
