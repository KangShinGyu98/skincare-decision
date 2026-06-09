import { AuthenticatedUser } from './auth.type';

export type RequestContext = {
  requestId: string;
  deviceId?: string;
  sessionId?: string;
  user?: AuthenticatedUser;
  ip?: string;
  userAgent?: string;
  startedAt: number;
};
