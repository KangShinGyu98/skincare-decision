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

    const roles = storedSession.roles ?? (await this.findUserRoles(storedSession.userId));

    return this.toAuthenticatedUser(storedSession.userId, roles);
  }

  async logout(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) {
      return;
    }

    await this.sessionService.deleteSessionByToken(sessionToken);
  }

  private async findUserRoles(userId: string): Promise<UserRole[]> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'Invalid session',
      });
    }

    return [user.role];
  }

  private toAuthenticatedUser(id: string, roles: UserRole[]): AuthenticatedUser {
    return {
      id,
      roles,
      permissions: permissionsForRoles(roles),
    };
  }
}
