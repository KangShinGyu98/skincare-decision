import { PriorityRuleConditionSeed, PriorityRuleSeed } from '../types';

// 티어 매크로(docs/ContentSpec/skincare_ruleset_v10.md §0.3). DB 컬럼이 아니라 조건 묶음이다.
// [T1아님] = 치료 수준이 아님 (EXCLUDED 2줄)
const T1_EXCLUDED: readonly PriorityRuleConditionSeed[] = [
  {
    questionKey: 'diagnosis.skin_problems',
    operator: 'IN',
    value: [0, 1, 2, 3, 4],
    state: 'EXCLUDED',
  },
  {
    questionKey: 'diagnosis.treatment_status',
    operator: 'IN',
    value: [0, 1, 2],
    state: 'EXCLUDED',
  },
];
// [T2] = 장벽 민감 = [T1아님] + 최근 자극 있음
const T2: readonly PriorityRuleConditionSeed[] = [
  ...T1_EXCLUDED,
  { questionKey: 'routine.recent_irritation', operator: 'EQ', value: [0], state: 'REQUIRED' },
];
// [T3] = 장벽 멀쩡 = [T1아님] + 최근 자극 없음
const T3: readonly PriorityRuleConditionSeed[] = [
  ...T1_EXCLUDED,
  { questionKey: 'routine.recent_irritation', operator: 'EQ', value: [1], state: 'REQUIRED' },
];

const CTA = {
  cleanser: { ctaLabel: '클렌저 보기', ctaTarget: '/category-decision?category=cleanser' },
  moisturizer: { ctaLabel: '로션·크림 보기', ctaTarget: '/category-decision?category=moisturizer' },
  sunscreen: { ctaLabel: '썬크림 보기', ctaTarget: '/category-decision?category=sunscreen' },
  toner: { ctaLabel: '토너 보기', ctaTarget: '/category-decision?category=toner' },
  serum: { ctaLabel: '세럼 보기', ctaTarget: '/category-decision?category=serum' },
} as const;

export const PRIORITY_RULE_SEEDS: readonly PriorityRuleSeed[] = [
  // ── 의료·치료 라우팅 ──────────────────────────────────────────────
  {
    key: 'medical_routing',
    name: '의료 라우팅',
    sortOrder: 10,
    resultType: 'HOLD',
    resultTitle: '병원 진료가 먼저예요',
    resultDescription: '이건 화장품보다 병원이 답이에요. 피부과 진료를 먼저 받아보세요.',
    conditions: [
      {
        questionKey: 'diagnosis.skin_problems',
        operator: 'IN',
        value: [0, 1, 2, 3, 4],
        state: 'REQUIRED',
      },
    ],
  },
  {
    key: 'under_treatment',
    name: '치료 중 안내',
    sortOrder: 20,
    resultType: 'HOLD',
    resultTitle: '치료 중엔 새 제품을 멈추세요',
    resultDescription: '치료 중엔 새 기능성 제품을 멈추고 보습·자외선차단·세안만 챙기세요.',
    conditions: [
      {
        questionKey: 'diagnosis.treatment_status',
        operator: 'IN',
        value: [0, 1, 2],
        state: 'REQUIRED',
      },
    ],
  },
  {
    key: 'hormonal_pattern_routing',
    name: '호르몬 패턴 라우팅',
    sortOrder: 30,
    resultType: 'CAUTION',
    resultTitle: '산부인과 병행 진료도 고려해보세요',
    resultDescription: '턱선·주기 연동 패턴이면 산부인과 병행 진료도 고려해보세요.',
    conditions: [
      { questionKey: 'diagnosis.hormonal_pattern', operator: 'EQ', value: [0], state: 'REQUIRED' },
    ],
  },
  // ── T2(장벽 민감) 대응 ────────────────────────────────────────────
  {
    key: 'active_serum_hold',
    name: '액티브 세럼 중단',
    sortOrder: 110,
    resultType: 'HOLD',
    resultTitle: '기능성 세럼을 잠시 멈추세요',
    resultDescription: '자극이 있으면 기능성 제품을 잠시 멈추는 게 좋습니다.',
    conditions: [
      ...T2,
      {
        questionKey: 'product.serum_actives',
        operator: 'IN',
        value: [0, 1, 3, 9],
        state: 'REQUIRED',
      },
    ],
  },
  {
    key: 'acid_toner_hold',
    name: '산성 토너 중단',
    sortOrder: 120,
    resultType: 'HOLD',
    resultTitle: '산성 토너를 잠시 중단하세요',
    resultDescription: '자극성 토너가 자극의 원인이 될 수 있습니다. 잠시 중단해보세요.',
    conditions: [
      ...T2,
      { questionKey: 'product.toner_type', operator: 'EQ', value: [3], state: 'REQUIRED' },
    ],
  },
  {
    key: 'exfoliant_cleanser_hold',
    name: '각질 클렌저 중단',
    sortOrder: 130,
    resultType: 'HOLD',
    resultTitle: '각질 클렌저를 잠시 멈추세요',
    resultDescription: '클렌저의 각질 제거 성분이 자극의 원인일 수 있습니다.',
    conditions: [
      ...T2,
      {
        questionKey: 'product.cleanser_exfoliant',
        operator: 'IN',
        value: [0, 1],
        state: 'REQUIRED',
      },
    ],
  },
  {
    key: 'reduce_amount',
    name: '사용량 줄이기',
    sortOrder: 140,
    resultType: 'CAUTION',
    resultTitle: '도포량부터 줄여보세요',
    resultDescription: '제품을 바꾸기 전에 도포량과 겹 수부터 줄여보세요.',
    conditions: [
      ...T2,
      { questionKey: 'routine.overapply', operator: 'EQ', value: [0], state: 'REQUIRED' },
    ],
  },
  {
    key: 'reduce_layering',
    name: '레이어링 줄이기',
    sortOrder: 150,
    resultType: 'CAUTION',
    resultTitle: '겹 수를 줄여보세요',
    resultDescription: '기초 단계가 많아요. 겹 수를 줄이면 자극이 덜할 수 있어요.',
    // Q-T2 선택지는 5겹이 없어 "6겹 이상" = 인덱스 4 이상 → GTE [4] (문서 GTE[6] 교정)
    conditions: [
      ...T2,
      { questionKey: 'product.layer_count', operator: 'GTE', value: [4], state: 'REQUIRED' },
    ],
  },
  {
    key: 'low_irritation_sunscreen_sensitive',
    name: '저자극 자차 전환(민감)',
    sortOrder: 160,
    resultType: 'CAUTION',
    resultTitle: '자극이 덜한 자차로 바꿔보세요',
    resultDescription:
      '유기자차를 쓰고 있다면 자극이 덜한 혼합·무기자차·4세대 필터 유기자차로 바꿔보세요.',
    conditions: [
      ...T2,
      { questionKey: 'product.sunscreen_type', operator: 'EQ', value: [0], state: 'REQUIRED' },
    ],
  },
  {
    key: 'niacinamide_caution',
    name: '나이아신아마이드 주의',
    sortOrder: 170,
    resultType: 'CAUTION',
    resultTitle: '나이아신아마이드 농도를 확인하세요',
    resultDescription:
      '나이아신아마이드는 장벽 강화에 도움이 되지만, 농도가 높거나(10% 이상) 아직 적응 전이라면 따끔거릴 수 있어요.',
    conditions: [
      ...T2,
      { questionKey: 'product.serum_actives', operator: 'CONTAINS', value: [2], state: 'REQUIRED' },
    ],
  },
  {
    key: 'azelaic_caution',
    name: '아젤라익 주의',
    sortOrder: 175,
    resultType: 'CAUTION',
    resultTitle: '아젤라익 농도·적응을 확인하세요',
    resultDescription:
      '아젤라익은 농도가 높거나(15~20%) 적응 전이라면 따끔거림·홍조가 흔해요. 농도와 적응 상태를 확인하세요.',
    conditions: [
      ...T2,
      { questionKey: 'product.serum_actives', operator: 'CONTAINS', value: [5], state: 'REQUIRED' },
    ],
  },
  {
    key: 'first_cleanser_soften',
    name: '1차 클렌저 세정력 낮추기',
    sortOrder: 180,
    resultType: 'CAUTION',
    resultTitle: '1차 클렌저 세정력을 낮추세요',
    resultDescription: '자극이 있는 동안엔 클렌징 밀크처럼 순한 1차 클렌저로 낮춰보세요.',
    conditions: [
      ...T2,
      { questionKey: 'product.first_cleanser', operator: 'EQ', value: [2], state: 'REQUIRED' },
    ],
  },
  // ── 세안·클렌저 ──────────────────────────────────────────────────
  {
    key: 'cleanser_introduce',
    name: '클렌저 도입',
    sortOrder: 210,
    resultType: 'ROUTE_CATEGORY',
    resultTitle: '클렌저를 하나 들이세요',
    resultDescription: '물세안만으로는 부족해요. 클렌저를 하나 들이세요.',
    ...CTA.cleanser,
    conditions: [
      { questionKey: 'product.cleanser_type', operator: 'EQ', value: [4], state: 'REQUIRED' },
    ],
  },
  {
    key: 'weak_acidic_switch',
    name: '약산성 전환',
    sortOrder: 220,
    resultType: 'CAUTION',
    resultTitle: '세안제는 약산성이 기본이에요',
    resultDescription: '세안제는 약산성이 기본이에요.',
    conditions: [
      { questionKey: 'product.cleanser_ph', operator: 'IN', value: [1, 2], state: 'REQUIRED' },
      { questionKey: 'routine.daytime_oily', operator: 'EQ', value: [0], state: 'EXCLUDED' },
    ],
  },
  {
    key: 'alkaline_cleansing_correction',
    name: '알칼리 세정 오해 교정',
    sortOrder: 230,
    resultType: 'CAUTION',
    resultTitle: '약산성 세안 + 피지조절이 나아요',
    resultDescription: '세정력을 올리기보다 약산성 세안 + 피지조절 성분이 나아요.',
    conditions: [
      { questionKey: 'product.cleanser_ph', operator: 'IN', value: [1, 2], state: 'REQUIRED' },
      { questionKey: 'routine.daytime_oily', operator: 'EQ', value: [0], state: 'REQUIRED' },
    ],
  },
  {
    key: 'reduce_overwashing_irritation',
    name: '과세안 줄이기(자극)',
    sortOrder: 240,
    resultType: 'CAUTION',
    resultTitle: '세안 횟수를 줄여보세요',
    resultDescription: '세안 횟수를 하루 2회로 줄여보세요.',
    conditions: [
      { questionKey: 'routine.wash_count', operator: 'EQ', value: [3], state: 'REQUIRED' },
      { questionKey: 'routine.recent_irritation', operator: 'EQ', value: [0], state: 'REQUIRED' },
    ],
  },
  {
    key: 'reduce_overwashing_dryness',
    name: '과세안 줄이기(건조)',
    sortOrder: 250,
    resultType: 'CAUTION',
    resultTitle: '세안 횟수를 줄여보세요',
    resultDescription: '세안 횟수를 하루 2회로 줄여보세요.',
    conditions: [
      { questionKey: 'routine.wash_count', operator: 'EQ', value: [3], state: 'REQUIRED' },
      { questionKey: 'routine.post_wash_tight', operator: 'EQ', value: [0], state: 'REQUIRED' },
      { questionKey: 'routine.recent_irritation', operator: 'EQ', value: [0], state: 'EXCLUDED' },
    ],
  },
  {
    key: 'first_cleanser_introduce_sensitive',
    name: '1차 클렌저 도입(민감)',
    sortOrder: 260,
    resultType: 'ROUTE_CATEGORY',
    resultTitle: '순한 1차 클렌저부터 시작하세요',
    resultDescription: '클렌징 워터나 밀크처럼 순한 1차 클렌저부터 시작하세요.',
    ...CTA.cleanser,
    conditions: [
      ...T2,
      { questionKey: 'routine.makeup_frequency', operator: 'IN', value: [0, 1], state: 'REQUIRED' },
      { questionKey: 'product.first_cleanser', operator: 'EQ', value: [3], state: 'REQUIRED' },
    ],
  },
  {
    key: 'first_cleanser_introduce',
    name: '1차 클렌저 도입',
    sortOrder: 270,
    resultType: 'ROUTE_CATEGORY',
    resultTitle: '순한 것부터 시도해보세요',
    resultDescription: '클렌징 워터 → 밀크 → 밤/오일 순으로, 순한 것부터 시도해보세요.',
    ...CTA.cleanser,
    conditions: [
      ...T3,
      { questionKey: 'routine.makeup_frequency', operator: 'IN', value: [0, 1], state: 'REQUIRED' },
      { questionKey: 'product.first_cleanser', operator: 'EQ', value: [3], state: 'REQUIRED' },
    ],
  },
  {
    key: 'residue_cleansing_boost',
    name: '잔여감 세정 보강',
    sortOrder: 280,
    resultType: 'CAUTION',
    resultTitle: '세정을 보강하세요',
    resultDescription: '이지워시 썬크림으로 바꾸거나 클렌징 밀크를 더해보세요.',
    conditions: [
      { questionKey: 'product.sunscreen_type', operator: 'EQ', value: [3], state: 'EXCLUDED' },
      { questionKey: 'product.cleanse_residue', operator: 'EQ', value: [0], state: 'REQUIRED' },
      { questionKey: 'product.first_cleanser', operator: 'EQ', value: [3], state: 'REQUIRED' },
    ],
  },
  // ── 보습제 ───────────────────────────────────────────────────────
  {
    key: 'moisturizer_introduce_oily',
    name: '보습제 도입(지성)',
    sortOrder: 310,
    resultType: 'ROUTE_CATEGORY',
    resultTitle: '젤 제형 보습제를 채우세요',
    resultDescription: '젤·워터젤 제형의 보습제를 채우세요.',
    ...CTA.moisturizer,
    conditions: [
      { questionKey: 'product.moisturizer_type', operator: 'EQ', value: [6], state: 'REQUIRED' },
      { questionKey: 'routine.post_wash_tight', operator: 'EQ', value: [0], state: 'REQUIRED' },
      { questionKey: 'routine.daytime_oily', operator: 'EQ', value: [0], state: 'REQUIRED' },
    ],
  },
  {
    key: 'moisturizer_introduce_nonoily',
    name: '보습제 도입(비지성)',
    sortOrder: 320,
    resultType: 'ROUTE_CATEGORY',
    resultTitle: '보습제를 채우세요',
    resultDescription: '보습제를 채우세요.',
    ...CTA.moisturizer,
    conditions: [
      { questionKey: 'product.moisturizer_type', operator: 'EQ', value: [6], state: 'REQUIRED' },
      { questionKey: 'routine.post_wash_tight', operator: 'EQ', value: [0], state: 'REQUIRED' },
      { questionKey: 'routine.daytime_oily', operator: 'EQ', value: [0], state: 'EXCLUDED' },
    ],
  },
  {
    key: 'moisturizer_consolidate',
    name: '보습제 통합',
    sortOrder: 330,
    resultType: 'CAUTION',
    resultTitle: '보습제는 하나로 충분해요',
    resultDescription: '보습제는 하나로 충분해요. 겹쳐 쓰는 것부터 정리해보세요.',
    conditions: [
      { questionKey: 'product.moisturizer_type', operator: 'EQ', value: [5], state: 'REQUIRED' },
    ],
  },
  // ── 썬크림 ───────────────────────────────────────────────────────
  {
    key: 'sunscreen_introduce_oily',
    name: '썬크림 도입(지성)',
    sortOrder: 410,
    resultType: 'ROUTE_CATEGORY',
    resultTitle: '무기자차로 시작해보세요',
    resultDescription: '무기자차 썬크림으로 시작해보세요.',
    ...CTA.sunscreen,
    conditions: [
      { questionKey: 'product.sunscreen_type', operator: 'IN', value: [3, 4], state: 'REQUIRED' },
      { questionKey: 'routine.daytime_oily', operator: 'EQ', value: [0], state: 'REQUIRED' },
    ],
  },
  {
    key: 'sunscreen_introduce_dry',
    name: '썬크림 도입(건성)',
    sortOrder: 420,
    resultType: 'ROUTE_CATEGORY',
    resultTitle: '유기자차로 시작해보세요',
    resultDescription: '유기자차 썬크림으로 시작해보세요.',
    ...CTA.sunscreen,
    conditions: [
      { questionKey: 'product.sunscreen_type', operator: 'IN', value: [3, 4], state: 'REQUIRED' },
      { questionKey: 'routine.daytime_oily', operator: 'EQ', value: [0], state: 'EXCLUDED' },
      { questionKey: 'routine.post_wash_tight', operator: 'EQ', value: [0], state: 'REQUIRED' },
    ],
  },
  {
    key: 'indoor_cloudy_correction',
    name: '실내·흐림 오해 교정',
    sortOrder: 430,
    resultType: 'CAUTION',
    resultTitle: '10분 이상 외출엔 썬크림을',
    resultDescription: '창가나 겨울이 아니라면, 10분 이상 외출할 땐 썬크림을 바르세요.',
    conditions: [
      { questionKey: 'product.sunscreen_type', operator: 'EQ', value: [3], state: 'REQUIRED' },
      { questionKey: 'product.outdoor_range', operator: 'IN', value: [0, 1], state: 'REQUIRED' },
    ],
  },
  {
    key: 'eye_sting_sunscreen_switch',
    name: '눈시림 자차 전환',
    sortOrder: 440,
    resultType: 'CAUTION',
    resultTitle: '자극이 덜한 자차로 바꿔보세요',
    resultDescription: '자극이 덜한 무기자차나 4세대 필터 유기자차로 바꿔보세요.',
    conditions: [
      ...T3,
      { questionKey: 'product.eye_sting', operator: 'EQ', value: [0], state: 'REQUIRED' },
      { questionKey: 'product.sunscreen_type', operator: 'IN', value: [0, 2], state: 'REQUIRED' },
    ],
  },
  {
    key: 'reapply_recommend',
    name: '덧바름 권장',
    sortOrder: 450,
    resultType: 'CAUTION',
    resultTitle: '2~3시간마다 덧발라주세요',
    resultDescription: '2~3시간마다 덧발라주세요.',
    conditions: [
      { questionKey: 'product.outdoor_range', operator: 'EQ', value: [3], state: 'REQUIRED' },
      { questionKey: 'product.sunscreen_reapply', operator: 'EQ', value: [1], state: 'REQUIRED' },
    ],
  },
  {
    key: 'reapply_unnecessary',
    name: '덧바름 불필요 안내',
    sortOrder: 460,
    resultType: 'PASS',
    resultTitle: '덧바르지 않아도 괜찮아요',
    resultDescription: '이 정도 활동량이면 굳이 덧바르지 않아도 괜찮아요.',
    conditions: [
      { questionKey: 'product.outdoor_range', operator: 'EQ', value: [2], state: 'REQUIRED' },
      { questionKey: 'product.sunscreen_reapply', operator: 'EQ', value: [0], state: 'REQUIRED' },
    ],
  },
  {
    key: 'white_cast_alternative',
    name: '백탁·발림성 대안',
    sortOrder: 470,
    resultType: 'CAUTION',
    resultTitle: '쿠션·파우더 제형을 고려하세요',
    resultDescription: '쿠션·파우더·패드 제형을 고려해보세요.',
    conditions: [
      {
        questionKey: 'product.white_cast_complaint',
        operator: 'EQ',
        value: [0],
        state: 'REQUIRED',
      },
    ],
  },
  // ── 토너 ─────────────────────────────────────────────────────────
  {
    key: 'toner_introduce',
    name: '토너 도입',
    sortOrder: 510,
    resultType: 'ROUTE_CATEGORY',
    resultTitle: '수분 토너를 더해보세요',
    resultDescription: '속당김이 있으니 수분 토너를 더해보세요.',
    ...CTA.toner,
    conditions: [
      ...T3,
      { questionKey: 'product.toner_type', operator: 'EQ', value: [0], state: 'REQUIRED' },
      { questionKey: 'routine.post_wash_tight', operator: 'EQ', value: [0], state: 'REQUIRED' },
      { questionKey: 'product.moisturizer_type', operator: 'EQ', value: [6], state: 'EXCLUDED' },
    ],
  },
  {
    key: 'weak_evidence_toner',
    name: '근거약함 경고(토너)',
    sortOrder: 520,
    resultType: 'CAUTION',
    resultTitle: '효능 근거가 약한 성분이에요',
    resultDescription: '이 성분은 효능 근거가 약하니 참고만 하세요.',
    conditions: [
      { questionKey: 'product.toner_type', operator: 'EQ', value: [4], state: 'REQUIRED' },
    ],
  },
  {
    key: 'weak_evidence_serum',
    name: '근거약함 경고(세럼)',
    sortOrder: 530,
    resultType: 'CAUTION',
    resultTitle: '효능 근거가 약한 성분이에요',
    resultDescription: '이 성분은 효능 근거가 약하니 참고만 하세요.',
    conditions: [
      { questionKey: 'product.serum_actives', operator: 'CONTAINS', value: [8], state: 'REQUIRED' },
      { questionKey: 'product.toner_type', operator: 'EQ', value: [4], state: 'EXCLUDED' },
    ],
  },
  {
    key: 'acid_overlap_toner_serum',
    name: '중복 경고(토너×세럼 산)',
    sortOrder: 540,
    resultType: 'CAUTION',
    resultTitle: '산 성분이 겹쳐요',
    resultDescription: '산 성분이 토너와 세럼에 겹쳐요. 하나로 정리하세요.',
    conditions: [
      { questionKey: 'product.toner_type', operator: 'EQ', value: [3], state: 'REQUIRED' },
      { questionKey: 'product.serum_actives', operator: 'CONTAINS', value: [3], state: 'REQUIRED' },
    ],
  },
  {
    key: 'retinoid_acid_overlap',
    name: '중복 경고(레티노이드×산)',
    sortOrder: 550,
    resultType: 'CAUTION',
    resultTitle: '레티노이드와 산은 함께 쓰지 마세요',
    resultDescription:
      '레티노이드와 산은 함께 쓰지 마세요.(아침·저녁으로 나눠 쓰는 건 괜찮습니다.)',
    conditions: [
      { questionKey: 'product.serum_actives', operator: 'CONTAINS', value: [0], state: 'REQUIRED' },
      { questionKey: 'product.serum_actives', operator: 'CONTAINS', value: [3], state: 'REQUIRED' },
    ],
  },
  {
    key: 'acne_patch_guide',
    name: '여드름 패치 안내',
    sortOrder: 560,
    resultType: 'CAUTION',
    resultTitle: '여드름 패치를 써보세요',
    resultDescription: '여드름 패치를 사용해보세요.',
    conditions: [
      { questionKey: 'diagnosis.acne_patch', operator: 'EQ', value: [1], state: 'REQUIRED' },
    ],
  },
  // ── 개선 목적(T3) ─────────────────────────────────────────────────
  {
    key: 'aging_sunscreen_first',
    name: '노화 전 썬크림 우선',
    sortOrder: 610,
    resultType: 'ROUTE_CATEGORY',
    resultTitle: '레티노이드보다 썬크림이 먼저예요',
    resultDescription: '레티노이드보다 썬크림이 먼저예요.',
    ...CTA.sunscreen,
    conditions: [
      ...T3,
      { questionKey: 'goal.improve', operator: 'CONTAINS', value: [0], state: 'REQUIRED' },
      { questionKey: 'product.sunscreen_type', operator: 'EQ', value: [3], state: 'REQUIRED' },
    ],
  },
  {
    key: 'improve_aging',
    name: '개선-노화',
    sortOrder: 620,
    resultType: 'ROUTE_CATEGORY',
    resultTitle: '레티노이드 세럼을 시작하세요',
    resultDescription: '레티노이드 세럼을 야간·주 2~3회로 시작하세요.',
    ...CTA.serum,
    conditions: [
      ...T3,
      { questionKey: 'goal.improve', operator: 'CONTAINS', value: [0], state: 'REQUIRED' },
      { questionKey: 'product.sunscreen_type', operator: 'EQ', value: [3], state: 'EXCLUDED' },
      { questionKey: 'product.serum_actives', operator: 'CONTAINS', value: [0], state: 'EXCLUDED' },
    ],
  },
  {
    key: 'improve_exfoliation',
    name: '개선-각질',
    sortOrder: 630,
    resultType: 'ROUTE_CATEGORY',
    resultTitle: '레티노이드나 BHA 하나만 고르세요',
    resultDescription: '레티노이드나 BHA 중 하나만 골라 시작하세요.',
    ...CTA.serum,
    conditions: [
      ...T3,
      { questionKey: 'goal.improve', operator: 'CONTAINS', value: [1], state: 'REQUIRED' },
      { questionKey: 'product.serum_actives', operator: 'CONTAINS', value: [0], state: 'EXCLUDED' },
      { questionKey: 'product.serum_actives', operator: 'CONTAINS', value: [3], state: 'EXCLUDED' },
    ],
  },
  {
    key: 'improve_sebum',
    name: '개선-피지 분비',
    sortOrder: 640,
    resultType: 'ROUTE_CATEGORY',
    resultTitle: '나이아신아마이드 세럼을 고르세요',
    resultDescription: '나이아신아마이드 세럼을 고르세요.',
    ...CTA.serum,
    conditions: [
      ...T3,
      { questionKey: 'goal.improve', operator: 'CONTAINS', value: [2], state: 'REQUIRED' },
      { questionKey: 'product.serum_actives', operator: 'CONTAINS', value: [2], state: 'EXCLUDED' },
    ],
  },
  {
    key: 'brightening_sunscreen_first',
    name: '미백 전 썬크림 우선',
    sortOrder: 650,
    resultType: 'ROUTE_CATEGORY',
    resultTitle: '비타민C보다 썬크림이 먼저예요',
    resultDescription: '비타민C보다 썬크림이 먼저예요.',
    ...CTA.sunscreen,
    conditions: [
      ...T3,
      { questionKey: 'goal.improve', operator: 'CONTAINS', value: [3], state: 'REQUIRED' },
      { questionKey: 'product.sunscreen_type', operator: 'EQ', value: [3], state: 'REQUIRED' },
    ],
  },
  {
    key: 'improve_brightening',
    name: '개선-미백·안색',
    sortOrder: 660,
    resultType: 'ROUTE_CATEGORY',
    resultTitle: '비타민C 세럼을 고르세요',
    resultDescription: '비타민C 세럼을 고르세요.',
    ...CTA.serum,
    conditions: [
      ...T3,
      { questionKey: 'goal.improve', operator: 'CONTAINS', value: [3], state: 'REQUIRED' },
      { questionKey: 'product.sunscreen_type', operator: 'EQ', value: [3], state: 'EXCLUDED' },
      { questionKey: 'product.serum_actives', operator: 'CONTAINS', value: [1], state: 'EXCLUDED' },
    ],
  },
  {
    key: 'improve_introduce_order',
    name: '개선-도입 순서',
    sortOrder: 670,
    resultType: 'CAUTION',
    resultTitle: '한 번에 하나씩 적응시키세요',
    resultDescription:
      '한 번에 하나씩, 나이아신아마이드 → 레티노이드 → 비타민C 순으로 적응시키세요.',
    conditions: [
      ...T3,
      { questionKey: 'goal.improve', operator: 'IN', value: [0, 1, 2, 3], state: 'REQUIRED' },
      { questionKey: 'product.serum_count', operator: 'EQ', value: [0], state: 'EXCLUDED' },
    ],
  },
  {
    key: 'improve_usage_time',
    name: '개선-사용 시간대',
    sortOrder: 680,
    resultType: 'CAUTION',
    resultTitle: '성분별 사용 시간대를 지키세요',
    resultDescription: '아침엔 비타민C·나이아신아마이드, 저녁엔 레티노이드예요.',
    conditions: [
      ...T3,
      { questionKey: 'goal.improve', operator: 'IN', value: [0, 3], state: 'REQUIRED' },
    ],
  },
  {
    key: 'improve_duration_notice',
    name: '개선-기간 고지',
    sortOrder: 690,
    resultType: 'CAUTION',
    resultTitle: '효과까지 4~12주는 봐야 해요',
    resultDescription:
      '자외선 차단이 전제이고, 4~12주는 봐야 하며, 나아지지 않으면 시술 영역이에요.',
    conditions: [
      ...T3,
      { questionKey: 'goal.improve', operator: 'IN', value: [0, 1, 2, 3], state: 'REQUIRED' },
    ],
  },
  // ── 위생 ─────────────────────────────────────────────────────────
  {
    key: 'pillowcase_change',
    name: '베갯잇 교체',
    sortOrder: 810,
    resultType: 'CAUTION',
    resultTitle: '베갯잇을 자주 갈아주세요',
    resultDescription: '베갯잇을 자주 갈아주세요.',
    conditions: [
      {
        questionKey: 'routine.pillowcase_change',
        operator: 'IN',
        value: [2, 3],
        state: 'REQUIRED',
      },
    ],
  },
  {
    key: 'brush_wash',
    name: '브러시 세척',
    sortOrder: 820,
    resultType: 'CAUTION',
    resultTitle: '브러시를 주기적으로 세척하세요',
    resultDescription: '브러시·퍼프를 7~10일마다 세척하세요.',
    conditions: [
      { questionKey: 'routine.brush_wash', operator: 'IN', value: [2], state: 'REQUIRED' },
    ],
  },
];
