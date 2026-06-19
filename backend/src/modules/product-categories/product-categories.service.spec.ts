import { Test } from '@nestjs/testing';
import { ProductCategoriesService } from './product-categories.service';
import { ProductCategoriesRepository } from './product-categories.repository';

/** ProductCategoriesService의 findAll 메서드는
 * ProductCategoriesRepository의 findAll 메서드가 반환하는 값을 그대로 반환한다.
 */
describe('ProductCategoriesService', () => {
  let service: ProductCategoriesService;
  let repositoryMock: jest.Mocked<Pick<ProductCategoriesRepository, 'findAll'>>;
  // ProductCategoriesRepository의 findAll 메서드만 사용하는데,
  // jest.Mocked와 Pick(TS 문법)을 이용해서 타입을 정의해준다.

  beforeEach(async () => {
    // mock repository 선언
    repositoryMock = {
      findAll: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [ProductCategoriesService], // 실제 Service를 등록한다.
    })
      .useMocker((token) => {
        if (token === ProductCategoriesRepository) {
          return repositoryMock;
        }
        return;
      })
      .compile();

    service = module.get(ProductCategoriesService);
  });

  it('findAll은 repository.findAll 결과를 응답 DTO 형태로 반환한다', async () => {
    const rows = [
      {
        id: '01935b8f-0000-7000-8000-000000000001',
        key: 'cleanser',
        name: '클렌저',
        description: '세안 제품',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: null,
      },
    ];

    const result = {
      items: [
        {
          id: '01935b8f-0000-7000-8000-000000000001',
          key: 'cleanser',
          name: '클렌저',
          description: '세안 제품',
        },
      ],
    };

    repositoryMock.findAll.mockResolvedValue(rows);

    await expect(service.findAll()).resolves.toEqual(result);
    expect(repositoryMock.findAll).toHaveBeenCalledTimes(1);
  });
});
