import { Test } from '@nestjs/testing';
import type { UserRecord } from './users.repository';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repositoryMock: jest.Mocked<
    Pick<
      UsersRepository,
      'findByGoogleId' | 'findByEmail' | 'linkGoogleId' | 'createFromGoogleProfile'
    >
  >;

  const googleProfile = { googleId: 'google-sub-1', email: 'user@example.com', name: 'User' };

  const existingUser: UserRecord = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User',
    role: 'USER',
    googleId: 'google-sub-1',
    consentedAt: null,
  };

  beforeEach(async () => {
    repositoryMock = {
      findByGoogleId: jest.fn(),
      findByEmail: jest.fn(),
      linkGoogleId: jest.fn(),
      createFromGoogleProfile: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: UsersRepository, useValue: repositoryMock }],
    }).compile();

    service = module.get(UsersService);
  });

  it('googleId로 기존 유저를 찾으면 그대로 반환한다', async () => {
    repositoryMock.findByGoogleId.mockResolvedValue(existingUser);

    await expect(service.upsertFromGoogleProfile(googleProfile)).resolves.toEqual(existingUser);
    expect(repositoryMock.findByEmail).not.toHaveBeenCalled();
    expect(repositoryMock.createFromGoogleProfile).not.toHaveBeenCalled();
  });

  it('googleId로 못 찾고 email로 기존 유저를 찾으면 googleId를 연결한다', async () => {
    repositoryMock.findByGoogleId.mockResolvedValue(null);
    repositoryMock.findByEmail.mockResolvedValue({ ...existingUser, googleId: null });
    repositoryMock.linkGoogleId.mockResolvedValue(existingUser);

    await expect(service.upsertFromGoogleProfile(googleProfile)).resolves.toEqual(existingUser);
    expect(repositoryMock.linkGoogleId).toHaveBeenCalledWith('user-1', 'google-sub-1');
    expect(repositoryMock.createFromGoogleProfile).not.toHaveBeenCalled();
  });

  it('googleId, email 모두 못 찾으면 role=USER로 신규 유저를 생성한다', async () => {
    repositoryMock.findByGoogleId.mockResolvedValue(null);
    repositoryMock.findByEmail.mockResolvedValue(null);
    repositoryMock.createFromGoogleProfile.mockResolvedValue(existingUser);

    await expect(service.upsertFromGoogleProfile(googleProfile)).resolves.toEqual(existingUser);
    expect(repositoryMock.createFromGoogleProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        name: 'User',
        googleId: 'google-sub-1',
      }),
    );
  });
});
