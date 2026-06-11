import { AuthenticatedUser } from './auth.type';

export type RequestContext = {
  requestId: string;
  deviceId?: string;
  sessionId?: string; // raw sessionId, 쿠키에 저장되는 값
  user?: AuthenticatedUser;
  ip?: string;
  userAgent?: string;
  startedAt: number;
};
