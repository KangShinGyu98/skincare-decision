import { Test } from '@nestjs/testing';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductCategoriesService } from './product-categories.service';

/**
 * ProductCategoriesController의 findAll 메서드는
 * ProductCategoriesService의 findAll 메서드가 반환하는 값을 그대로 반환한다.
 */
describe('ProductCategoriesController', () => {
  let controller: ProductCategoriesController;
  let serviceMock: jest.Mocked<Pick<ProductCategoriesService, 'findAll'>>;
  //ProductCategoriesService의 findAll 메서드만 사용하는데,
  // jest.Mocked와 Pick(TS 문법)을 이용해서 타입을 정의해준다.

  beforeEach(async () => {
    //mock service 선언
    serviceMock = {
      findAll: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [ProductCategoriesController], //해당 컨트롤러를 쓸 때 필요한 의존성들을 등록해준다.
    })
      .useMocker((token) => {
        if (token === ProductCategoriesService) {
          return serviceMock;
        }
        return;
      })
      .compile();
    controller = module.get(ProductCategoriesController);
  });

  it('findAll은 service.findAll 결과를 반환한다', async () => {
    const result = {
      items: [
        {
          id: '01935b8f-0000-7000-8000-000000000001',
          key: 'cleanser',
          name: '클렌저',
          description: '세안 제품',
          sortOrder: 60,
        },
      ],
    };

    serviceMock.findAll.mockResolvedValue(result);

    await expect(controller.findAll()).resolves.toBe(result);
    expect(serviceMock.findAll).toHaveBeenCalledTimes(1);
  });
});
