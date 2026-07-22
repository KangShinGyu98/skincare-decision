import { Injectable, UnauthorizedException } from '@nestjs/common';
import { permissionsForRoles } from '../../common/auth/rbac-policy';
import type { AuthenticatedUser, UserRole } from '../../common/types/auth.type';
import { SessionService } from '../session/session.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
  ) {}

  async authenticateSession(sessionToken: string): Promise<AuthenticatedUser | undefined> {
    const storedSession = await this.sessionService.getStoredSessionByToken(sessionToken);

    if (!storedSession?.userId) {
      return undefined;
    }

    let roles = storedSession.roles;
    let email = storedSession.email;

    if (!roles || !email) {
      const user = await this.usersService.findById(storedSession.userId);

      if (!user) {
        throw new UnauthorizedException({
          code: 'INVALID_SESSION',
          message: 'Invalid session',
        });
      }

      roles = roles ?? [user.role];
      email = email ?? user.email;
    }

    return this.toAuthenticatedUser(storedSession.userId, email, roles);
  }

  async logout(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) {
      return;
    }

    await this.sessionService.deleteSessionByToken(sessionToken);
  }

  private toAuthenticatedUser(id: string, email: string, roles: UserRole[]): AuthenticatedUser {
    return {
      id,
      email,
      roles,
      permissions: permissionsForRoles(roles),
    };
  }
}
