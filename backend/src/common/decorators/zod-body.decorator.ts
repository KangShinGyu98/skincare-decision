import { Body, Param, Query } from '@nestjs/common';
import type { ZodType } from 'zod';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

/**
 * NestJS의 @Body(), @Query(), @Param() 데코레이터와 함께 사용할 수 있는 커스텀 데코레이터입니다.
 */
export function ZodBody(schema: ZodType<unknown>): ParameterDecorator {
  return Body(new ZodValidationPipe(schema));
}

export function ZodQuery(schema: ZodType<unknown>): ParameterDecorator {
  return Query(new ZodValidationPipe(schema));
}

export function ZodParam(schema: ZodType<unknown>): ParameterDecorator {
  return Param(new ZodValidationPipe(schema));
}
