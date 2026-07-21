import { z } from 'zod';

export const authenticatedUserSchema = z.object({
  id: z.string(),
  roles: z.array(z.enum(['USER', 'ADMIN'])),
  permissions: z.array(z.string()),
});

export type AuthenticatedUserDto = z.infer<typeof authenticatedUserSchema>;
