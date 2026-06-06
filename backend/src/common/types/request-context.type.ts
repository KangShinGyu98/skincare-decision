export type RequestContext = {
  requestId: string;
  deviceId?: string;
  sessionId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  startedAt: number;
};
