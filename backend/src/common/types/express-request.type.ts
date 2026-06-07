import type { Request } from 'express';
import type { RequestContext } from './request-context.type';

export type RequestWithContext = Request & {
  context: RequestContext;
};

export type MaybeRequestWithContext = Request & {
  context?: RequestContext;
};
