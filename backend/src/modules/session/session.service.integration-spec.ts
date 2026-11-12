import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getEnvFilePath } from 'src/config/env-file-path';
import { validateEnv } from 'src/config/env.validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionService } from './session.service';

const DEVICE_ID = '01935b8f-0000-7000-8000-0000000000d1';
const OTHER_DEVICE_ID = '01935b8f-0000-7000-8000-0000000000d2';
const USER_ID = '01935b8f-0000-7000-8000-0000000000a1';

/**
 * SessionService 통합 테스트입니다. (ADR-0008)
 * - opaque session 의 조회/연장/회전/폐기가 Postgres `user_sessions` 만으로 동작해야 한다.
 */
describe('SessionService', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let service: SessionService;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: getEnvFilePath(),
          validate: validateEnv,
        }),
      ],
      providers: [PrismaService, SessionService],
    }).compile();

    prisma = module.get(PrismaService);
    service = module.get(SessionService);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        users,
        devices
      RESTART IDENTITY CASCADE
    `);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await module?.close();
  });

  function ensure(sessionToken: string, deviceId = DEVICE_ID) {
    return service.ensureDeviceSession({ deviceId, sessionToken, entryPath: '/api/test' });
  }

  it('처음 보는 token 이면 익명 세션을 만들고, token 원문은 저장하지 않는다', async () => {
    const { sessionId } = await ensure('token-1');

    const row = await prisma.userSession.findUniqueOrThrow({ where: { id: sessionId } });

    expect(row.userId).toBeNull();
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.tokenHash).not.toContain('token-1');
    expect(row.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    await expect(service.getStoredSessionByToken('token-1')).resolves.toEqual({
      userSessionId: sessionId,
      deviceId: DEVICE_ID,
    });
  });

  it('유효한 token 으로 다시 오면 같은 세션을 쓰고 만료 시각을 연장한다', async () => {
    const first = await ensure('token-1');
    const past = new Date(Date.now() + 1000);
    await prisma.userSession.update({ where: { id: first.sessionId }, data: { expiresAt: past } });

    const second = await ensure('token-1');

    const row = await prisma.userSession.findUniqueOrThrow({ where: { id: first.sessionId } });
    expect(second.sessionId).toBe(first.sessionId);
    expect(row.expiresAt!.getTime()).toBeGreaterThan(past.getTime());
    await expect(prisma.userSession.count()).resolves.toBe(1);
  });

  it('만료된 token 은 인증에 쓰이지 않고, 다시 오면 새 세션이 같은 token 을 이어받는다', async () => {
    const first = await ensure('token-1');
    await prisma.userSession.update({
      where: { id: first.sessionId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(service.getStoredSessionByToken('token-1')).resolves.toBeUndefined();

    const second = await ensure('token-1');

    expect(second.sessionId).not.toBe(first.sessionId);
    const old = await prisma.userSession.findUniqueOrThrow({ where: { id: first.sessionId } });
    expect(old.tokenHash).toBeNull();
    await expect(service.getStoredSessionByToken('token-1')).resolves.toMatchObject({
      userSessionId: second.sessionId,
    });
  });

  it('다른 device 가 같은 token 을 들고 오면 기존 세션을 넘겨주지 않는다', async () => {
    const first = await ensure('token-1');

    const second = await ensure('token-1', OTHER_DEVICE_ID);

    expect(second.sessionId).not.toBe(first.sessionId);
    await expect(service.getStoredSessionByToken('token-1')).resolves.toEqual({
      userSessionId: second.sessionId,
      deviceId: OTHER_DEVICE_ID,
    });
  });

  it('로그인 회전은 기존 token 을 폐기하고 새 token 에 유저 정보를 붙인다', async () => {
    await prisma.user.create({
      data: { id: USER_ID, email: 'admin@example.com', name: 'Admin', role: 'ADMIN' },
    });
    await ensure('anonymous-token');

    const { sessionId } = await service.rotateToAuthenticatedSession({
      oldSessionToken: 'anonymous-token',
      newSessionToken: 'login-token',
      deviceId: DEVICE_ID,
      userId: USER_ID,
      roles: ['ADMIN'],
      email: 'admin@example.com',
      entryPath: '/api/auth/google/callback',
    });

    await expect(service.getStoredSessionByToken('anonymous-token')).resolves.toBeUndefined();
    await expect(service.getStoredSessionByToken('login-token')).resolves.toEqual({
      userSessionId: sessionId,
      deviceId: DEVICE_ID,
      userId: USER_ID,
      email: 'admin@example.com',
      roles: ['ADMIN'],
    });
    await expect(ensure('login-token')).resolves.toEqual({ sessionId });
  });

  it('로그아웃하면 token 은 무효가 되고 row 는 이력으로 남는다', async () => {
    const { sessionId } = await ensure('token-1');

    await service.deleteSessionByToken('token-1');

    await expect(service.getStoredSessionByToken('token-1')).resolves.toBeUndefined();
    await expect(prisma.userSession.count({ where: { id: sessionId } })).resolves.toBe(1);
  });
});
