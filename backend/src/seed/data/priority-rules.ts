import { PriorityRuleSeed } from '../types';

export const PRIORITY_RULE_SEEDS: readonly PriorityRuleSeed[] = [
  {
    key: 'recent_irritation_stop',
    name: '최근 자극 반응 우선 중단',
    priority: 10,
    resultType: 'STOP',
    resultTitle: '새 제품 추가를 잠시 멈춰야 합니다',
    resultDescription: '최근 자극 반응이 있었다면 제품 추천보다 회복과 원인 분리가 먼저입니다.',
    ctaLabel: '루틴 점검하기',
    ctaTarget: '/decision/traceback',
    conditions: [
      {
        questionKey: 'life.recent_irritation',
        operator: 'EQ',
        value: [1],
        state: 'REQUIRED',
      },
    ],
  },
  {
    key: 'sunscreen_missing_route',
    name: '선크림 루틴 우선 추천',
    priority: 20,
    resultType: 'ROUTE_CATEGORY',
    resultTitle: '선크림을 먼저 고르는 것이 좋습니다',
    resultDescription: '낮 사용 루틴에서는 자외선 차단이 다른 기능성 제품보다 우선입니다.',
    recommendCategoryKey: 'sunscreen',
    ctaLabel: '선크림 보기',
    ctaTarget: '/category-decision?category=sunscreen',
    conditions: [
      {
        questionKey: 'routine.sunscreen_reapply',
        operator: 'EQ',
        value: [0],
        state: 'REQUIRED',
      },
      {
        questionKey: 'life.outdoor_activity',
        operator: 'IN',
        value: [2, 3],
        state: 'REQUIRED',
      },
    ],
  },
  {
    key: 'cleansing_unstable_route',
    name: '세안 안정화 우선 추천',
    priority: 30,
    resultType: 'ROUTE_CATEGORY',
    resultTitle: '클렌저를 먼저 점검해 주세요',
    resultDescription: '세안 후 당김이나 잔여감이 있으면 이후 단계 제품 판단이 흐려질 수 있습니다.',
    recommendCategoryKey: 'cleanser',
    ctaLabel: '클렌저 보기',
    ctaTarget: '/category-decision?category=cleanser',
    conditions: [
      {
        questionKey: 'routine.cleansing_stable',
        operator: 'EQ',
        value: [0],
        state: 'REQUIRED',
      },
    ],
  },
  {
    key: 'active_overload_hold',
    name: '활성 성분 과밀 루틴 보류',
    priority: 40,
    resultType: 'HOLD',
    resultTitle: '기능성 제품 추가는 보류하는 편이 안전합니다',
    resultDescription:
      '이미 활성 성분이 많은 루틴에서는 세럼과 각질 케어 제품을 추가하기 전에 중복을 줄여야 합니다.',
    holdCategories: ['serum', 'toner'],
    ctaLabel: '성분 중복 확인',
    ctaTarget: '/decision/traceback',
    conditions: [
      {
        questionKey: 'product.active_overload',
        operator: 'EQ',
        value: [1],
        state: 'REQUIRED',
      },
    ],
  },
  {
    key: 'toner_overlap_caution',
    name: '토너 중복 구매 주의',
    priority: 50,
    resultType: 'CAUTION',
    resultTitle: '비슷한 토너를 이미 쓰고 있을 수 있습니다',
    resultDescription:
      '토너를 추가할 때는 보습/진정/각질 케어 목적이 기존 제품과 겹치지 않는지 확인해야 합니다.',
    holdCategories: ['toner'],
    ctaLabel: '토너 필터 조정',
    ctaTarget: '/category-decision?category=toner',
    conditions: [
      {
        questionKey: 'product.toner_overlap',
        operator: 'EQ',
        value: [1],
        state: 'REQUIRED',
      },
    ],
  },
];
