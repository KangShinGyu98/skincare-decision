import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getEnvFilePath } from 'src/config/env-file-path';
import { validateEnv } from 'src/config/env.validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductCategoriesRepository } from './product-categories.repository';
/**
 * /product-categories 엔드포인트에 대한 통합 테스트입니다.
 * - 테스트 DB의 product_categories row를 반환해야 한다.
 * - 각 카테고리는 id, key, name, description만 포함해야 한다.
 */
describe('/product-categories', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let repository: ProductCategoriesRepository;

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
      providers: [PrismaService, ProductCategoriesRepository],
    }).compile();

    prisma = module.get(PrismaService);
    repository = module.get(ProductCategoriesRepository);
    // DB 연결
    // migrate 확인
  });
  beforeEach(async () => {
    // truncate
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        product_categories
      RESTART IDENTITY CASCADE
    `);
  });

  afterAll(async () => {
    // DB 연결 종료
    await prisma?.$disconnect();
    await module?.close();
  });

  it('product_categories 테이블의 row를 반환해야 한다', async () => {
    await prisma.productCategory.createMany({
      data: [
        {
          id: '01935b8f-0000-7000-8000-000000000001',
          key: 'cleanser',
          name: 'Cleanser',
          description: 'Face wash category',
        },
        {
          id: '01935b8f-0000-7000-8000-000000000002',
          key: 'toner',
          name: 'Toner',
          description: 'Hydration category',
        },
      ],
    });

    const result = await repository.findAll();

    expect(result).toEqual([
      expect.objectContaining({
        id: '01935b8f-0000-7000-8000-000000000001',
        key: 'cleanser',
        name: 'Cleanser',
        description: 'Face wash category',
      }),
      expect.objectContaining({
        id: '01935b8f-0000-7000-8000-000000000002',
        key: 'toner',
        name: 'Toner',
        description: 'Hydration category',
      }),
    ]);
  });

  it('각 카테고리는 id, key, name, description만을 포함해야 한다', async () => {
    await prisma.productCategory.create({
      data: {
        id: '01935b8f-0000-7000-8000-000000000001',
        key: 'cleanser',
        name: 'Cleanser',
        description: 'Face wash category',
      },
    });

    const [category] = await repository.findAll();

    expect(category).toEqual({
      id: '01935b8f-0000-7000-8000-000000000001',
      key: 'cleanser',
      name: 'Cleanser',
      description: 'Face wash category',
    });
  });
});
