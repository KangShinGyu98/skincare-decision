import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { permissionsForRoles } from '../../common/auth/rbac-policy';
import type { AuthenticatedUser, UserRole } from '../../common/types/auth.type';
import type { Env } from '../../config/env.validation';
import { UsersService } from '../users/users.service';

type AccessTokenPayload = {
  sub: string;
  roles: UserRole[];
};

export type LoginResult = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  user: AuthenticatedUser;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async login(username: string, password: string): Promise<LoginResult> {
    const user = await this.usersService.findOne(username);

    if (!user || user.password !== password) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
      });
    }

    const authenticatedUser = this.toAuthenticatedUser(user.id, user.roles);
    const expiresInSeconds = this.configService.get('JWT_ACCESS_TOKEN_TTL_SECONDS', {
      infer: true,
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      roles: user.roles,
    } satisfies AccessTokenPayload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresInSeconds,
      user: authenticatedUser,
    };
  }

  async authenticateAccessToken(token: string): Promise<AuthenticatedUser> {
    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Invalid access token',
      });
    }

    if (!this.isAccessTokenPayload(payload)) {
      throw new UnauthorizedException({
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Invalid access token',
      });
    }

    return this.toAuthenticatedUser(payload.sub, payload.roles);
  }

  private toAuthenticatedUser(id: string, roles: UserRole[]): AuthenticatedUser {
    return {
      id,
      roles,
      permissions: permissionsForRoles(roles),
    };
  }

  private isAccessTokenPayload(payload: unknown): payload is AccessTokenPayload {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }

    const record = payload as Record<string, unknown>;
    const sub = record['sub'];
    const roles = record['roles'];

    return (
      typeof sub === 'string' &&
      Array.isArray(roles) &&
      roles.every((role) => role === 'USER' || role === 'ADMIN')
    );
  }
}
