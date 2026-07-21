import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getEnvFilePath } from 'src/config/env-file-path';
import { validateEnv } from 'src/config/env.validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersRepository } from './users.repository';

/**
 * UsersRepository 통합 테스트입니다.
 * - googleId/email 조회, googleId 연결, Google 프로필로부터의 신규 생성이 DB에 올바르게 반영되어야 한다.
 */
describe('UsersRepository', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let repository: UsersRepository;

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
      providers: [PrismaService, UsersRepository],
    }).compile();

    prisma = module.get(PrismaService);
    repository = module.get(UsersRepository);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        users
      RESTART IDENTITY CASCADE
    `);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await module?.close();
  });

  it('findByGoogleId는 일치하는 row가 없으면 null을 반환한다', async () => {
    await expect(repository.findByGoogleId('missing-google-id')).resolves.toBeNull();
  });

  it('createFromGoogleProfile은 role=USER로 신규 유저를 생성한다', async () => {
    const created = await repository.createFromGoogleProfile({
      id: '01935b8f-0000-7000-8000-0000000000a1',
      email: 'new-user@example.com',
      name: 'New User',
      googleId: 'google-sub-new',
    });

    expect(created).toEqual({
      id: '01935b8f-0000-7000-8000-0000000000a1',
      email: 'new-user@example.com',
      name: 'New User',
      role: 'USER',
      googleId: 'google-sub-new',
    });

    await expect(repository.findByGoogleId('google-sub-new')).resolves.toEqual(created);
  });

  it('linkGoogleId는 기존 유저에 googleId를 연결한다', async () => {
    await prisma.user.create({
      data: {
        id: '01935b8f-0000-7000-8000-0000000000a2',
        email: 'existing-user@example.com',
        name: 'Existing User',
        role: 'ADMIN',
      },
    });

    const linked = await repository.linkGoogleId(
      '01935b8f-0000-7000-8000-0000000000a2',
      'google-sub-existing',
    );

    expect(linked).toEqual({
      id: '01935b8f-0000-7000-8000-0000000000a2',
      email: 'existing-user@example.com',
      name: 'Existing User',
      role: 'ADMIN',
      googleId: 'google-sub-existing',
    });
  });

  it('findByEmail은 email로 유저를 찾는다', async () => {
    await prisma.user.create({
      data: {
        id: '01935b8f-0000-7000-8000-0000000000a3',
        email: 'lookup@example.com',
        name: 'Lookup User',
        role: 'USER',
      },
    });

    await expect(repository.findByEmail('lookup@example.com')).resolves.toEqual({
      id: '01935b8f-0000-7000-8000-0000000000a3',
      email: 'lookup@example.com',
      name: 'Lookup User',
      role: 'USER',
      googleId: null,
    });
  });
});
