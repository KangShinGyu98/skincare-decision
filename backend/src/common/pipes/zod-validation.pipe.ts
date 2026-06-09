import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

type ValidationIssue = {
  path: string;
  code: string;
  message: string;
};

@Injectable()
export class ZodValidationPipe implements PipeTransform<unknown, unknown> {
  constructor(private readonly schema: ZodType<unknown>) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data;
    }

    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Invalid request input',
      details: result.error.issues.map(
        (issue): ValidationIssue => ({
          path: issue.path.join('.'),
          code: issue.code,
          message: issue.message,
        }),
      ),
    });
  }
}
