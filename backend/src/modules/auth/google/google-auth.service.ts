import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import type { Env } from '../../../config/env.validation';

export type GoogleProfile = {
  googleId: string;
  email: string;
  name: string;
};

const GOOGLE_OAUTH_SCOPES = ['openid', 'email', 'profile'];

/**
 * Google OAuth 2.0 API만 다루는 Provider 계층.
 * 유저 upsert, 세션 발급 등 도메인 로직은 이 서비스가 알지 못한다.
 */
@Injectable()
export class GoogleAuthService {
  private readonly client: OAuth2Client;
  private readonly clientId: string;

  constructor(configService: ConfigService<Env, true>) {
    this.clientId = configService.get('GOOGLE_CLIENT_ID', { infer: true });

    this.client = new OAuth2Client({
      clientId: this.clientId,
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET', { infer: true }),
      redirectUri: configService.get('GOOGLE_CALLBACK_URL', { infer: true }),
    });
  }

  buildAuthUrl(state: string): string {
    return this.client.generateAuthUrl({
      access_type: 'online',
      scope: GOOGLE_OAUTH_SCOPES,
      // 로그아웃 후 재로그인 시 이전 계정으로 자동 로그인되지 않고 계정 선택 화면을 항상 보여준다.
      prompt: 'select_account',
      state,
    });
  }

  async exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
    const { tokens } = await this.client.getToken(code);

    if (!tokens.id_token) {
      throw new UnauthorizedException({
        code: 'GOOGLE_TOKEN_EXCHANGE_FAILED',
        message: 'Google did not return an ID token',
      });
    }

    const ticket = await this.client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.clientId,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException({
        code: 'GOOGLE_PROFILE_INVALID',
        message: 'Google profile is missing required fields',
      });
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email,
    };
  }
}
