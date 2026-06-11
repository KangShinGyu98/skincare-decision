import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { permissionsForRoles } from '../../common/auth/rbac-policy';
import type { AuthenticatedUser, UserRole } from '../../common/types/auth.type';
import { SessionService } from '../session/session.service';
import { UsersService } from '../users/users.service';

export type LoginContext = {
  deviceId?: string;
  oldSessionToken?: string;
  newSessionToken: string;
  entryPath: string;
  referrer?: string;
};

export type LoginResult = {
  sessionId: string;
  expiresInSeconds: number;
  user: AuthenticatedUser;
};

/**
 * 임시 로그인 서비스
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
  ) {}

  async login(username: string, password: string, context: LoginContext): Promise<LoginResult> {
    const user = this.usersService.findOne(username);

    if (!user || user.password !== password) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
      });
    }

    if (!context.deviceId) {
      throw new InternalServerErrorException({
        code: 'DEVICE_CONTEXT_MISSING',
        message: 'Device context is missing',
      });
    }

    await this.usersService.ensureDatabaseUser(user);

    const rotatedSession = await this.sessionService.rotateToAuthenticatedSession({
      ...(context.oldSessionToken ? { oldSessionToken: context.oldSessionToken } : {}),
      newSessionToken: context.newSessionToken,
      deviceId: context.deviceId,
      userId: user.id,
      roles: user.roles,
      entryPath: context.entryPath,
      ...(context.referrer ? { referrer: context.referrer } : {}),
    });

    return {
      sessionId: rotatedSession.sessionId,
      expiresInSeconds: this.sessionService.getSessionTtlSeconds(),
      user: this.toAuthenticatedUser(user.id, user.roles),
    };
  }

  async authenticateSession(sessionToken: string): Promise<AuthenticatedUser | undefined> {
    const storedSession = await this.sessionService.getStoredSessionByToken(sessionToken);

    if (!storedSession?.userId) {
      return undefined;
    }

    const roles = storedSession.roles ?? this.findUserRoles(storedSession.userId);

    return this.toAuthenticatedUser(storedSession.userId, roles);
  }

  async logout(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) {
      return;
    }

    await this.sessionService.deleteSessionByToken(sessionToken);
  }

  private findUserRoles(userId: string): UserRole[] {
    const user = this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'Invalid session',
      });
    }

    return user.roles;
  }

  private toAuthenticatedUser(id: string, roles: UserRole[]): AuthenticatedUser {
    return {
      id,
      roles,
      permissions: permissionsForRoles(roles),
    };
  }
}
