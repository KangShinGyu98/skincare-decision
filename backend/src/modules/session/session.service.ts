import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { v7 as uuidv7 } from 'uuid';
import type { UserRole } from '../../common/types/auth.type';
import type { Env } from '../../config/env.validation';
import { PrismaService } from '../../prisma/prisma.service';

export type StoredSession = {
  userSessionId: string;
  deviceId: string;
  userId?: string;
  roles?: UserRole[];
  email?: string;
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
  email: string;
  entryPath: string;
  referrer?: string;
};

export type RotateToAuthenticatedSessionResult = {
  sessionId: string;
};

/**
 * ADR-0008: opaque session 의 저장소는 Postgres `user_sessions` 다.
 * cookie 의 token 은 `sha256(token)` 으로만 저장하고(`token_hash`), 수명은 `expires_at` 로 관리한다.
 */
@Injectable()
export class SessionService {
  private readonly sessionTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService<Env, true>,
  ) {
    this.sessionTtlSeconds = configService.get('SESSION_COOKIE_MAX_AGE_SECONDS', { infer: true });
  }

  async ensureDeviceSession(input: EnsureDeviceSessionInput): Promise<EnsureDeviceSessionResult> {
    await this.ensureDevice(input.deviceId);

    const sessionId = await this.extendActiveSession(input.sessionToken, input.deviceId);

    if (sessionId) {
      return {
        sessionId,
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

    const sessionId = uuidv7();

    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        deviceId: input.deviceId,
        userId: input.userId,
        entryPath: this.truncate(input.entryPath, 255),
        referrer: input.referrer ?? null,
        loggedInAt: new Date(),
        tokenHash: this.hashSessionToken(input.newSessionToken),
        expiresAt: this.nextExpiresAt(),
      },
    });

    return {
      sessionId,
    };
  }

  async getStoredSessionByToken(sessionToken: string): Promise<StoredSession | undefined> {
    const row = await this.prisma.userSession.findUnique({
      where: {
        tokenHash: this.hashSessionToken(sessionToken),
      },
      select: {
        id: true,
        deviceId: true,
        userId: true,
        expiresAt: true,
        deletedAt: true,
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
    });

    if (!row || row.deletedAt || !row.expiresAt || row.expiresAt <= new Date()) {
      return undefined;
    }

    const storedSession: StoredSession = {
      userSessionId: row.id,
      deviceId: row.deviceId,
    };

    if (row.userId && row.user) {
      storedSession.userId = row.userId;
      storedSession.email = row.user.email;
      storedSession.roles = [row.user.role];
    }

    return storedSession;
  }

  /** token 을 row 에서 떼어 내 무효화한다. row 자체는 분석/이력용으로 남긴다. */
  async deleteSessionByToken(sessionToken: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: {
        tokenHash: this.hashSessionToken(sessionToken),
      },
      data: {
        tokenHash: null,
        expiresAt: new Date(),
      },
    });
  }

  getSessionTtlSeconds(): number {
    return this.sessionTtlSeconds;
  }

  /** 유효한 session 이면 만료 시각을 sliding 연장하고 id 를 돌려준다. 조회와 연장을 쿼리 1번으로 처리한다. */
  private async extendActiveSession(
    sessionToken: string,
    deviceId: string,
  ): Promise<string | undefined> {
    const rows = await this.prisma.userSession.updateManyAndReturn({
      where: {
        tokenHash: this.hashSessionToken(sessionToken),
        deviceId,
        deletedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        expiresAt: this.nextExpiresAt(),
      },
      select: {
        id: true,
      },
    });

    return rows[0]?.id;
  }

  private async createAnonymousSession(
    input: EnsureDeviceSessionInput,
  ): Promise<EnsureDeviceSessionResult> {
    // 만료됐거나 다른 device 에 묶인 row 가 같은 token 을 쥐고 있으면 unique 제약에 걸리므로 먼저 떼어 낸다.
    await this.deleteSessionByToken(input.sessionToken);

    const sessionId = uuidv7();

    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        deviceId: input.deviceId,
        entryPath: this.truncate(input.entryPath, 255),
        referrer: input.referrer ?? null,
        tokenHash: this.hashSessionToken(input.sessionToken),
        expiresAt: this.nextExpiresAt(),
      },
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

  private nextExpiresAt(): Date {
    return new Date(Date.now() + this.sessionTtlSeconds * 1000);
  }

  private hashSessionToken(sessionToken: string): string {
    return createHash('sha256').update(sessionToken).digest('hex');
  }

  private truncate(value: string, maxLength: number): string {
    return value.length > maxLength ? value.slice(0, maxLength) : value;
  }
}
