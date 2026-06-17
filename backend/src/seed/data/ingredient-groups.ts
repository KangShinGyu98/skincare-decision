import { IngredientGroupSeed } from '../types';

export const INGREDIENT_GROUP_SEEDS = [
  {
    key: 'fragrance_allergens',
    name: '향료 알러젠',
    description: '향료 및 향료 알러젠으로 분류되는 성분군',
  },
  {
    key: 'essential_oils',
    name: '향료성 에센셜 오일',
    description: '스피어민트, 유칼립투스, 오렌지껍질오일 등 향료성 식물 오일 성분군',
  },
  {
    key: 'drying_alcohols',
    name: '건조감 유발 알코올',
    description: '에탄올 등 민감 피부에서 건조감이나 자극을 유발할 수 있는 알코올 성분군',
  },
  {
    key: 'chemical_exfoliants',
    name: '화학적 각질 케어 성분',
    description: 'AHA, BHA, PHA, LHA 및 관련 산 성분군',
  },
  {
    key: 'retinoids',
    name: '레티노이드',
    description: '레티놀, 레티날 등 비타민 A 계열 활성 성분군',
  },
  {
    key: 'vitamin_c',
    name: '비타민 C 계열',
    description: '아스코빅애씨드 및 비타민 C 유도체 성분군',
  },
  {
    key: 'barrier_lipids',
    name: '장벽 지질',
    description: '세라마이드, 콜레스테롤, 지방산 등 장벽 보강 성분군',
  },
  {
    key: 'soothing_agents',
    name: '진정 보조 성분',
    description: '판테놀, 알란토인, 병풀 유래 성분 등 진정 보조 성분군',
  },
  {
    key: 'humectants',
    name: '수분 결합 성분',
    description: '글리세린, 히알루론산, 베타인 등 수분 결합 성분군',
  },
  {
    key: 'preservatives',
    name: '보존제',
    description: '제품 보존을 위한 방부 및 보존 보조 성분군',
  },
] as const satisfies readonly IngredientGroupSeed[];
