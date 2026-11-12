import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  const prisma = { $queryRaw: jest.fn() };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health/db', () => {
    it('DB 에 쿼리를 한 번 보내고 ok 를 반환한다', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      await expect(appController.healthDb()).resolves.toEqual({ ok: true });
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('DB 쿼리가 실패하면 에러를 그대로 던진다', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

      await expect(appController.healthDb()).rejects.toThrow('connection refused');
    });
  });
});
