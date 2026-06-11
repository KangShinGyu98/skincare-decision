import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { v7 as uuidv7 } from 'uuid';
import type { UserRole } from '../../common/types/auth.type';
import type { Env } from '../../config/env.validation';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export type StoredSession = {
  userSessionId: string;
  deviceId: string;
  userId?: string;
  roles?: UserRole[];
  createdAt: string;
  lastSeenAt: string;
};

export type EnsureDeviceSessionInput = {
  deviceId: string;
  sessionToken: string;
  entryPath: string;
  referrer?: string;
};

export type EnsureDeviceSessionResult = {
  sessionId: string;
};

export type RotateToAuthenticatedSessionInput = {
  oldSessionToken?: string;
  newSessionToken: string;
  deviceId: string;
  userId: string;
  roles: UserRole[];
  entryPath: string;
  referrer?: string;
};

export type RotateToAuthenticatedSessionResult = {
  sessionId: string;
};

@Injectable()
export class SessionService {
  private readonly sessionTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    configService: ConfigService<Env, true>,
  ) {
    this.sessionTtlSeconds = configService.get('SESSION_COOKIE_MAX_AGE_SECONDS', { infer: true });
  }

  async ensureDeviceSession(input: EnsureDeviceSessionInput): Promise<EnsureDeviceSessionResult> {
    await this.ensureDevice(input.deviceId);

    const storedSession = await this.getStoredSessionByToken(input.sessionToken);

    if (storedSession && storedSession.deviceId === input.deviceId) {
      await this.storeSession(input.sessionToken, {
        ...storedSession,
        lastSeenAt: new Date().toISOString(),
      });

      return {
        sessionId: storedSession.userSessionId,
      };
    }

    return this.createAnonymousSession(input);
  }

  async rotateToAuthenticatedSession(
    input: RotateToAuthenticatedSessionInput,
  ): Promise<RotateToAuthenticatedSessionResult> {
    if (input.oldSessionToken) {
      await this.deleteSessionByToken(input.oldSessionToken);
    }

    await this.ensureDevice(input.deviceId, input.userId);

    const now = new Date();
    const sessionId = uuidv7();

    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        deviceId: input.deviceId,
        userId: input.userId,
        entryPath: this.truncate(input.entryPath, 255),
        referrer: input.referrer ?? null,
        loggedInAt: now,
      },
    });

    await this.storeSession(input.newSessionToken, {
      userSessionId: sessionId,
      deviceId: input.deviceId,
      userId: input.userId,
      roles: input.roles,
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
    });

    return {
      sessionId,
    };
  }

  async getStoredSessionByToken(sessionToken: string): Promise<StoredSession | undefined> {
    const raw = await this.redis.get(this.sessionRedisKey(sessionToken));

    if (!raw) {
      return undefined;
    }

    try {
      return this.parseStoredSession(JSON.parse(raw) as unknown);
    } catch {
      return undefined;
    }
  }

  async deleteSessionByToken(sessionToken: string): Promise<void> {
    await this.redis.delete(this.sessionRedisKey(sessionToken));
  }

  getSessionTtlSeconds(): number {
    return this.sessionTtlSeconds;
  }

  private async createAnonymousSession(
    input: EnsureDeviceSessionInput,
  ): Promise<EnsureDeviceSessionResult> {
    const now = new Date();
    const sessionId = uuidv7();

    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        deviceId: input.deviceId,
        entryPath: this.truncate(input.entryPath, 255),
        referrer: input.referrer ?? null,
      },
    });

    await this.storeSession(input.sessionToken, {
      userSessionId: sessionId,
      deviceId: input.deviceId,
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
    });

    return {
      sessionId,
    };
  }

  private async ensureDevice(deviceId: string, userId?: string): Promise<void> {
    const now = new Date();

    await this.prisma.device.upsert({
      where: {
        id: deviceId,
      },
      create: {
        id: deviceId,
        ...(userId ? { userId } : {}),
        lastSeenAt: now,
      },
      update: {
        lastSeenAt: now,
        ...(userId ? { userId } : {}),
      },
    });
  }

  private async storeSession(sessionToken: string, session: StoredSession): Promise<void> {
    await this.redis.setJson(this.sessionRedisKey(sessionToken), session, this.sessionTtlSeconds);
  }

  private sessionRedisKey(sessionToken: string): string {
    return `session:${this.hashSessionToken(sessionToken)}`;
  }

  private hashSessionToken(sessionToken: string): string {
    return createHash('sha256').update(sessionToken).digest('hex');
  }

  private parseStoredSession(value: unknown): StoredSession | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return undefined;
    }

    const record = value as Record<string, unknown>;
    const userSessionId = record['userSessionId'];
    const deviceId = record['deviceId'];
    const userId = record['userId'];
    const roles = record['roles'];
    const createdAt = record['createdAt'];
    const lastSeenAt = record['lastSeenAt'];

    if (
      typeof userSessionId !== 'string' ||
      typeof deviceId !== 'string' ||
      typeof createdAt !== 'string' ||
      typeof lastSeenAt !== 'string'
    ) {
      return undefined;
    }

    if (userId !== undefined && typeof userId !== 'string') {
      return undefined;
    }

    if (roles !== undefined && !this.isUserRoleArray(roles)) {
      return undefined;
    }

    const storedSession: StoredSession = {
      userSessionId,
      deviceId,
      createdAt,
      lastSeenAt,
    };

    if (typeof userId === 'string') {
      storedSession.userId = userId;
    }

    if (this.isUserRoleArray(roles)) {
      storedSession.roles = roles;
    }

    return storedSession;
  }

  private isUserRoleArray(value: unknown): value is UserRole[] {
    return Array.isArray(value) && value.every((role): role is UserRole => this.isUserRole(role));
  }

  private isUserRole(value: unknown): value is UserRole {
    return value === 'USER' || value === 'ADMIN';
  }

  private truncate(value: string, maxLength: number): string {
    return value.length > maxLength ? value.slice(0, maxLength) : value;
  }
}
