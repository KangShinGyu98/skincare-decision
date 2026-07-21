import { z } from 'zod';

export const authenticatedUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  roles: z.array(z.enum(['USER', 'ADMIN'])),
  permissions: z.array(z.string()),
  consentRequired: z.boolean(),
});

export type AuthenticatedUserDto = z.infer<typeof authenticatedUserSchema>;
