import { ProductCategorySeed } from '../types';

export const PRODUCT_CATEGORY_SEEDS = [
  {
    key: 'toner',
    name: '토너',
    description: '세안 후 첫 단계에서 피부결을 정돈하고 가볍게 수분을 공급하는 제품',
    sortOrder: 10,
  },
  {
    key: 'sunscreen',
    name: '선크림',
    description: '자외선 차단 기능을 가진 데일리 보호 제품',
    sortOrder: 20,
  },
  {
    key: 'serum',
    name: '세럼',
    description: '특정 피부 고민을 위해 기능 성분을 집중 케어하는 제품',
    sortOrder: 30,
  },
  {
    key: 'lipcare',
    name: '립케어',
    description: '입술 보습과 보호를 위한 제품',
    sortOrder: 40,
  },
  {
    key: 'moisturizer',
    name: '로션 / 크림',
    description: '피부에 수분과 유분을 공급하고 장벽을 보호하는 보습 제품',
    sortOrder: 50,
  },
  {
    key: 'cleanser',
    name: '클렌저',
    description: '피부 노폐물, 선크림, 메이크업을 제거하는 세안 제품',
    sortOrder: 60,
  },
] as const satisfies readonly ProductCategorySeed[];
