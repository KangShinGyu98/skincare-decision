import { Body, Param, Query } from '@nestjs/common';
import type { ZodType } from 'zod';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

export function ZodBody(schema: ZodType<unknown>): ParameterDecorator {
  return Body(new ZodValidationPipe(schema));
}

export function ZodQuery(schema: ZodType<unknown>): ParameterDecorator {
  return Query(new ZodValidationPipe(schema));
}

export function ZodParam(schema: ZodType<unknown>): ParameterDecorator {
  return Param(new ZodValidationPipe(schema));
}
