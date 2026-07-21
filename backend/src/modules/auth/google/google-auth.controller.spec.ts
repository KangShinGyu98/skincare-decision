import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { RequestWithContext } from '../../../common/types/express-request.type';
import type { UserRecord } from '../../users/users.repository';
import { SessionCookieService } from '../../session/session-cookie.service';
import { SessionService } from '../../session/session.service';
import { UsersService } from '../../users/users.service';
import { GoogleAuthController } from './google-auth.controller';
import { GoogleAuthService } from './google-auth.service';

function createResponseMock(): jest.Mocked<Pick<Response, 'cookie' | 'clearCookie' | 'redirect'>> {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    redirect: jest.fn(),
  };
}

function createRequestMock(overrides: Partial<RequestWithContext> = {}): RequestWithContext {
  return {
    context: { requestId: 'req-1', deviceId: 'device-1', startedAt: Date.now() },
    signedCookies: {},
    headers: {},
    originalUrl: '/api/auth/google/callback',
    ...overrides,
  } as RequestWithContext;
}

function decodeState(state: string): { nonce: string; redirectTo: string } {
  return JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as {
    nonce: string;
    redirectTo: string;
  };
}

describe('GoogleAuthController', () => {
  let controller: GoogleAuthController;
  let googleAuthServiceMock: jest.Mocked<
    Pick<GoogleAuthService, 'buildAuthUrl' | 'exchangeCodeForProfile'>
  >;
  let usersServiceMock: jest.Mocked<Pick<UsersService, 'upsertFromGoogleProfile'>>;
  let sessionServiceMock: jest.Mocked<Pick<SessionService, 'rotateToAuthenticatedSession'>>;
  let sessionCookieServiceMock: jest.Mocked<
    Pick<
      SessionCookieService,
      | 'readSignedCookie'
      | 'readSessionToken'
      | 'generateSessionToken'
      | 'setSessionCookie'
      | 'readReferrer'
    >
  >;
  const configServiceMock = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        CORS_ORIGIN: 'http://localhost:3000',
        NODE_ENV: 'test',
      };

      return values[key];
    }),
  } as unknown as ConfigService;

  const googleProfile = { googleId: 'google-sub', email: 'user@example.com', name: 'User' };
  const userRecord: UserRecord = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User',
    role: 'USER',
    googleId: 'google-sub',
    consentedAt: null,
  };

  beforeEach(async () => {
    googleAuthServiceMock = {
      buildAuthUrl: jest
        .fn()
        .mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock=1'),
      exchangeCodeForProfile: jest.fn().mockResolvedValue(googleProfile),
    };
    usersServiceMock = {
      upsertFromGoogleProfile: jest.fn().mockResolvedValue(userRecord),
    };
    sessionServiceMock = {
      rotateToAuthenticatedSession: jest.fn().mockResolvedValue({ sessionId: 'session-1' }),
    };
    sessionCookieServiceMock = {
      readSignedCookie: jest.fn(),
      readSessionToken: jest.fn().mockReturnValue(undefined),
      generateSessionToken: jest.fn().mockReturnValue('new-session-token'),
      setSessionCookie: jest.fn(),
      readReferrer: jest.fn().mockReturnValue(undefined),
    };

    const module = await Test.createTestingModule({
      controllers: [GoogleAuthController],
    })
      .useMocker((token) => {
        if (token === GoogleAuthService) return googleAuthServiceMock;
        if (token === UsersService) return usersServiceMock;
        if (token === SessionService) return sessionServiceMock;
        if (token === SessionCookieService) return sessionCookieServiceMock;
        if (token === ConfigService) return configServiceMock;
        return;
      })
      .compile();

    controller = module.get(GoogleAuthController);
  });

  describe('authorize', () => {
    it('nonce 쿠키를 설정하고 Google 인증 URL로 리다이렉트한다', () => {
      const response = createResponseMock();

      controller.authorize(response as unknown as Response, '/mypage');

      expect(response.cookie).toHaveBeenCalledWith(
        'google_oauth_state',
        expect.any(String),
        expect.objectContaining({ httpOnly: true, signed: true }),
      );
      expect(response.redirect).toHaveBeenCalledWith(
        'https://accounts.google.com/o/oauth2/v2/auth?mock=1',
      );

      const encodedState = googleAuthServiceMock.buildAuthUrl.mock.calls[0]?.[0] as string;
      expect(decodeState(encodedState).redirectTo).toBe('/mypage');
    });

    it('redirectTo가 안전하지 않으면 기본값 "/"으로 대체한다', () => {
      const response = createResponseMock();

      controller.authorize(response as unknown as Response, '//evil.example.com');

      const encodedState = googleAuthServiceMock.buildAuthUrl.mock.calls[0]?.[0] as string;
      expect(decodeState(encodedState).redirectTo).toBe('/');
    });
  });

  describe('callback', () => {
    it('state nonce가 쿠키와 일치하면 로그인 세션을 발급하고 redirectTo로 리다이렉트한다', async () => {
      const response = createResponseMock();
      const state = Buffer.from(
        JSON.stringify({ nonce: 'nonce-1', redirectTo: '/mypage' }),
      ).toString('base64url');
      sessionCookieServiceMock.readSignedCookie.mockReturnValue('nonce-1');

      await controller.callback(
        createRequestMock(),
        response as unknown as Response,
        'auth-code',
        state,
      );

      expect(usersServiceMock.upsertFromGoogleProfile).toHaveBeenCalledWith(googleProfile);
      expect(sessionServiceMock.rotateToAuthenticatedSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          roles: ['USER'],
          email: 'user@example.com',
          deviceId: 'device-1',
        }),
      );
      expect(sessionCookieServiceMock.setSessionCookie).toHaveBeenCalledWith(
        response,
        'new-session-token',
      );
      expect(response.redirect).toHaveBeenCalledWith('http://localhost:3000/mypage');
    });

    it('nonce가 일치하지 않으면 login_error로 리다이렉트하고 세션을 발급하지 않는다', async () => {
      const response = createResponseMock();
      const state = Buffer.from(
        JSON.stringify({ nonce: 'nonce-1', redirectTo: '/mypage' }),
      ).toString('base64url');
      sessionCookieServiceMock.readSignedCookie.mockReturnValue('different-nonce');

      await controller.callback(
        createRequestMock(),
        response as unknown as Response,
        'auth-code',
        state,
      );

      expect(usersServiceMock.upsertFromGoogleProfile).not.toHaveBeenCalled();
      expect(response.redirect).toHaveBeenCalledWith('http://localhost:3000/?login_error=1');
    });

    it('code가 없으면 login_error로 리다이렉트한다', async () => {
      const response = createResponseMock();

      await controller.callback(
        createRequestMock(),
        response as unknown as Response,
        undefined,
        undefined,
      );

      expect(response.redirect).toHaveBeenCalledWith('http://localhost:3000/?login_error=1');
    });

    it('deviceId가 없으면 login_error로 리다이렉트한다', async () => {
      const response = createResponseMock();
      const state = Buffer.from(JSON.stringify({ nonce: 'nonce-1', redirectTo: '/' })).toString(
        'base64url',
      );
      sessionCookieServiceMock.readSignedCookie.mockReturnValue('nonce-1');

      await controller.callback(
        createRequestMock({ context: { requestId: 'req-1', startedAt: Date.now() } }),
        response as unknown as Response,
        'auth-code',
        state,
      );

      expect(response.redirect).toHaveBeenCalledWith('http://localhost:3000/?login_error=1');
    });

    it('Google 프로필 교환이 실패하면 login_error로 리다이렉트한다', async () => {
      const response = createResponseMock();
      const state = Buffer.from(JSON.stringify({ nonce: 'nonce-1', redirectTo: '/' })).toString(
        'base64url',
      );
      sessionCookieServiceMock.readSignedCookie.mockReturnValue('nonce-1');
      googleAuthServiceMock.exchangeCodeForProfile.mockRejectedValueOnce(
        new Error('invalid_grant'),
      );

      await controller.callback(
        createRequestMock(),
        response as unknown as Response,
        'auth-code',
        state,
      );

      expect(response.redirect).toHaveBeenCalledWith('http://localhost:3000/?login_error=1');
    });
  });
});
