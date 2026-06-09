import { Body } from '@nestjs/common';
import type { ZodType } from 'zod';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

export function ZodBody(schema: ZodType<unknown>): ParameterDecorator {
  return Body(new ZodValidationPipe(schema));
}
