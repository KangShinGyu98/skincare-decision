import { Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { type UserRecord, UsersRepository } from './users.repository';

export type GoogleProfile = {
  googleId: string;
  email: string;
  name: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: string): Promise<UserRecord | null> {
    return this.usersRepository.findById(id);
  }

  /**
   * googleId로 기존 유저를 찾고, 없으면 email로 기존 유저를 찾아 googleId를 연결한다.
   * 그마저 없으면 role=USER로 신규 유저를 생성한다.
   */
  async upsertFromGoogleProfile(profile: GoogleProfile): Promise<UserRecord> {
    const byGoogleId = await this.usersRepository.findByGoogleId(profile.googleId);

    if (byGoogleId) {
      return byGoogleId;
    }

    const byEmail = await this.usersRepository.findByEmail(profile.email);

    if (byEmail) {
      return this.usersRepository.linkGoogleId(byEmail.id, profile.googleId);
    }

    return this.usersRepository.createFromGoogleProfile({
      id: uuidv7(),
      email: profile.email,
      name: profile.name,
      googleId: profile.googleId,
    });
  }

  async recordConsent(id: string): Promise<UserRecord> {
    return this.usersRepository.recordConsent(id);
  }
}
