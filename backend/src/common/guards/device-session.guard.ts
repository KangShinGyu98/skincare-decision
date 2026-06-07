import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { RequestWithContext } from '../types/express-request.type';

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
