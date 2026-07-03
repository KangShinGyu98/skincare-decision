import { Test } from '@nestjs/testing';
import { ProductCategoriesRepository } from './product-categories.repository';
import { ProductCategoriesService } from './product-categories.service';

describe('ProductCategoriesService', () => {
  let service: ProductCategoriesService;
  let repositoryMock: jest.Mocked<Pick<ProductCategoriesRepository, 'findAll'>>;

  beforeEach(async () => {
    repositoryMock = {
      findAll: jest.fn(),
    };

    const testingModule = await Test.createTestingModule({
      providers: [
        ProductCategoriesService,
        {
          provide: ProductCategoriesRepository,
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = testingModule.get(ProductCategoriesService);
  });

  it('findAll은 repository.findAll 결과를 응답 DTO 형태로 반환한다', async () => {
    const rows = [
      {
        id: '01935b8f-0000-7000-8000-000000000001',
        key: 'cleanser',
        name: '클렌저',
        description: '세안 제품',
        sortOrder: 60,
      },
    ];

    repositoryMock.findAll.mockResolvedValue(rows);

    await expect(service.findAll()).resolves.toEqual({
      items: rows,
    });

    expect(repositoryMock.findAll).toHaveBeenCalledTimes(1);
  });
});
