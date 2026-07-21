import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env.validation';
import { GoogleAuthService } from './google-auth.service';

const generateAuthUrlMock = jest.fn();
const getTokenMock = jest.fn();
const verifyIdTokenMock = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    generateAuthUrl: generateAuthUrlMock,
    getToken: getTokenMock,
    verifyIdToken: verifyIdTokenMock,
  })),
}));

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;

  const configServiceMock = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        GOOGLE_CLIENT_ID: 'client-id',
        GOOGLE_CLIENT_SECRET: 'client-secret',
        GOOGLE_CALLBACK_URL: 'http://localhost:4000/api/auth/google/callback',
      };

      return values[key];
    }),
  } as unknown as ConfigService<Env, true>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GoogleAuthService(configServiceMock);
  });

  it('buildAuthUrl은 openid/email/profile scope, select_account prompt, state를 포함한 인증 URL을 생성한다', () => {
    generateAuthUrlMock.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock=1');

    const url = service.buildAuthUrl('encoded-state');

    expect(generateAuthUrlMock).toHaveBeenCalledWith({
      access_type: 'online',
      scope: ['openid', 'email', 'profile'],
      prompt: 'select_account',
      state: 'encoded-state',
    });
    expect(url).toBe('https://accounts.google.com/o/oauth2/v2/auth?mock=1');
  });

  it('exchangeCodeForProfile은 코드 교환 및 ID 토큰 검증 후 프로필을 반환한다', async () => {
    getTokenMock.mockResolvedValue({ tokens: { id_token: 'id-token' } });
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ sub: 'google-sub', email: 'user@example.com', name: 'User Name' }),
    });

    const profile = await service.exchangeCodeForProfile('auth-code');

    expect(getTokenMock).toHaveBeenCalledWith('auth-code');
    expect(verifyIdTokenMock).toHaveBeenCalledWith({
      idToken: 'id-token',
      audience: 'client-id',
    });
    expect(profile).toEqual({
      googleId: 'google-sub',
      email: 'user@example.com',
      name: 'User Name',
    });
  });

  it('id_token이 없으면 UnauthorizedException을 던진다', async () => {
    getTokenMock.mockResolvedValue({ tokens: {} });

    await expect(service.exchangeCodeForProfile('auth-code')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('payload에 sub 또는 email이 없으면 UnauthorizedException을 던진다', async () => {
    getTokenMock.mockResolvedValue({ tokens: { id_token: 'id-token' } });
    verifyIdTokenMock.mockResolvedValue({ getPayload: () => ({}) });

    await expect(service.exchangeCodeForProfile('auth-code')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
