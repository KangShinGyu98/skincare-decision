// Global zod validation pipe that emits RFC 7807-style payloads.
import { BadRequestException } from '@nestjs/common';
import { createZodValidationPipe } from 'nestjs-zod';

export const AppZodValidationPipe = createZodValidationPipe({
  createValidationException: (error) =>
    new BadRequestException({
      type: 'https://api/errors/validation',
      title: 'Validation failed',
      status: 400,
      detail: 'Request data did not match the expected schema.',
      errors: error,
    }),
});
