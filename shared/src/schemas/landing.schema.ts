import { z } from 'zod';

export const selectLandingConcernBodySchema = z
  .object({
    concern: z.string().min(1),
  })
  .strict();

export type SelectLandingConcernBodyDto = z.infer<typeof selectLandingConcernBodySchema>;

export type SelectLandingConcernResponseDto = {
  concern: SelectLandingConcernBodyDto['concern'];
};
