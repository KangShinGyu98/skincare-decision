import { Test } from '@nestjs/testing';
import type { RequestWithContext } from '../../common/types/express-request.type';
import type { UserRecord } from '../users/users.repository';
import { UsersService } from '../users/users.service';
import { SessionCookieService } from '../session/session-cookie.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

function createRequestMock(): RequestWithContext {
  return {
    context: {
      requestId: 'req-1',
      startedAt: Date.now(),
      user: { id: 'user-1', email: 'user@example.com', roles: ['USER'], permissions: [] },
    },
  } as unknown as RequestWithContext;
}

describe('AuthController', () => {
  let controller: AuthController;
  let usersServiceMock: jest.Mocked<Pick<UsersService, 'findById' | 'recordConsent'>>;
  let authServiceMock: jest.Mocked<Pick<AuthService, 'logout'>>;
  let sessionCookieServiceMock: jest.Mocked<
    Pick<SessionCookieService, 'readSessionToken' | 'clearSessionCookie'>
  >;

  const baseUser: UserRecord = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User',
    role: 'USER',
    googleId: 'google-sub',
    consentedAt: null,
  };

  beforeEach(async () => {
    usersServiceMock = {
      findById: jest.fn().mockResolvedValue(baseUser),
      recordConsent: jest.fn().mockResolvedValue({ ...baseUser, consentedAt: new Date() }),
    };
    authServiceMock = {
      logout: jest.fn().mockResolvedValue(undefined),
    };
    sessionCookieServiceMock = {
      readSessionToken: jest.fn().mockReturnValue(undefined),
      clearSessionCookie: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [AuthController],
    })
      .useMocker((token) => {
        if (token === UsersService) return usersServiceMock;
        if (token === AuthService) return authServiceMock;
        if (token === SessionCookieService) return sessionCookieServiceMock;
        return;
      })
      .compile();

    controller = module.get(AuthController);
  });

  describe('me', () => {
    it('아직 동의하지 않은 유저는 consentRequired: true를 반환한다', async () => {
      usersServiceMock.findById.mockResolvedValue({ ...baseUser, consentedAt: null });

      await expect(controller.me(createRequestMock())).resolves.toMatchObject({
        id: 'user-1',
        email: 'user@example.com',
        consentRequired: true,
      });
    });

    it('이미 동의한 유저는 consentRequired: false를 반환한다', async () => {
      usersServiceMock.findById.mockResolvedValue({ ...baseUser, consentedAt: new Date() });

      await expect(controller.me(createRequestMock())).resolves.toMatchObject({
        consentRequired: false,
      });
    });
  });

  describe('consent', () => {
    it('현재 유저 id로 recordConsent를 호출한다', async () => {
      await expect(controller.consent(createRequestMock())).resolves.toEqual({ ok: true });

      expect(usersServiceMock.recordConsent).toHaveBeenCalledWith('user-1');
    });
  });
});
