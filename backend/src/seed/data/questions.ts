import {
  QuestionSeed,
  QuestionVariantSeed,
  QuestionVisibilityConditionSeed,
  SeedCategoryKey,
} from '../types';

const answerValues = (count: number): number[] =>
  Array.from({ length: count }, (_, index) => index);

// v10 룰셋(docs/ContentSpec/skincare_ruleset_v10.md) 기준 질문 세트.
// answers[] 순서 = 조건에서 참조하는 정수 인덱스. 성별·나이는 인적 정보 질문.
export const QUESTION_SEEDS = [
  // 인적
  { key: 'demographic.gender', answerType: 'SINGLE_CHOICE', answerValues: [0, 1] },
  { key: 'demographic.age', answerType: 'SINGLE_CHOICE', answerValues: answerValues(8) },
  // 루틴 습관
  { key: 'routine.wash_count', answerType: 'SINGLE_CHOICE', answerValues: answerValues(4) },
  { key: 'routine.makeup_frequency', answerType: 'SINGLE_CHOICE', answerValues: answerValues(3) },
  { key: 'routine.recent_irritation', answerType: 'SINGLE_CHOICE', answerValues: [0, 1] },
  { key: 'routine.post_wash_tight', answerType: 'SINGLE_CHOICE', answerValues: [0, 1] },
  { key: 'routine.daytime_oily', answerType: 'SINGLE_CHOICE', answerValues: [0, 1] },
  { key: 'routine.pillowcase_change', answerType: 'SINGLE_CHOICE', answerValues: answerValues(4) },
  { key: 'routine.brush_wash', answerType: 'SINGLE_CHOICE', answerValues: answerValues(4) },
  { key: 'routine.overapply', answerType: 'SINGLE_CHOICE', answerValues: [0, 1] },
  // 트러블·치료
  { key: 'diagnosis.skin_problems', answerType: 'MULTI_CHOICE', answerValues: answerValues(6) },
  { key: 'diagnosis.hormonal_pattern', answerType: 'SINGLE_CHOICE', answerValues: [0, 1] },
  { key: 'diagnosis.acne_patch', answerType: 'SINGLE_CHOICE', answerValues: [0, 1] },
  { key: 'diagnosis.treatment_status', answerType: 'MULTI_CHOICE', answerValues: answerValues(4) },
  // 개선 목적
  { key: 'goal.improve', answerType: 'MULTI_CHOICE', answerValues: answerValues(5) },
  // 사용제품
  { key: 'product.cleanser_type', answerType: 'SINGLE_CHOICE', answerValues: answerValues(3) },
  { key: 'product.cleanser_ph', answerType: 'SINGLE_CHOICE', answerValues: answerValues(3) },
  { key: 'product.cleanser_exfoliant', answerType: 'SINGLE_CHOICE', answerValues: answerValues(4) },
  { key: 'product.first_cleanser', answerType: 'SINGLE_CHOICE', answerValues: answerValues(4) },
  { key: 'product.cleanse_residue', answerType: 'SINGLE_CHOICE', answerValues: [0, 1] },
  { key: 'product.toner_type', answerType: 'SINGLE_CHOICE', answerValues: answerValues(5) },
  { key: 'product.layer_count', answerType: 'SINGLE_CHOICE', answerValues: answerValues(7) },
  { key: 'product.serum_count', answerType: 'SINGLE_CHOICE', answerValues: answerValues(3) },
  { key: 'product.serum_actives', answerType: 'MULTI_CHOICE', answerValues: answerValues(11) },
  { key: 'product.serum_frequency', answerType: 'SINGLE_CHOICE', answerValues: answerValues(3) },
  { key: 'product.moisturizer_type', answerType: 'SINGLE_CHOICE', answerValues: answerValues(7) },
  {
    key: 'product.moisturizer_functional',
    answerType: 'SINGLE_CHOICE',
    answerValues: answerValues(3),
  },
  { key: 'product.sunscreen_type', answerType: 'SINGLE_CHOICE', answerValues: answerValues(5) },
  { key: 'product.outdoor_range', answerType: 'SINGLE_CHOICE', answerValues: answerValues(4) },
  { key: 'product.sunscreen_reapply', answerType: 'SINGLE_CHOICE', answerValues: [0, 1] },
  { key: 'product.white_cast_complaint', answerType: 'SINGLE_CHOICE', answerValues: [0, 1] },
  { key: 'product.eye_sting', answerType: 'SINGLE_CHOICE', answerValues: [0, 1] },
] as const satisfies readonly QuestionSeed[];

const PRIORITY_GATE_QUESTION_VARIANT_SEEDS = [
  // 인적 --------------------------------------------------------------
  {
    questionKey: 'demographic.gender',
    title: '성별을 알려주세요.',
    answers: ['남성', '여성'],
    screen: 'priority_gate',
    uiSection: 'life_routine',
    sortOrder: 10,
  },
  {
    questionKey: 'demographic.age',
    title: '연령대를 알려주세요.',
    answers: [
      '10~15세',
      '16~20세',
      '21~25세',
      '26~30세',
      '31~40세',
      '41~50세',
      '51~60세',
      '60대 이상',
    ],
    screen: 'priority_gate',
    uiSection: 'life_routine',
    sortOrder: 20,
  },
  // 루틴 습관 ----------------------------------------------------------
  {
    questionKey: 'routine.wash_count',
    title: '하루 세안 횟수는?',
    answers: ['1회', '2회', '3회', '4~5회 이상'],
    screen: 'priority_gate',
    uiSection: 'life_routine',
    sortOrder: 30,
  },
  {
    questionKey: 'routine.makeup_frequency',
    title: '평소 메이크업을 얼마나 하나요?',
    answers: ['거의 매일', '가끔', '안 함'],
    screen: 'priority_gate',
    uiSection: 'life_routine',
    sortOrder: 40,
  },
  {
    questionKey: 'routine.recent_irritation',
    title: '최근 피부 자극을 느끼나요? (빨개짐·따가움·민감·좁쌀 여드름)',
    answers: ['있음', '없음'],
    screen: 'priority_gate',
    uiSection: 'life_routine',
    sortOrder: 50,
  },
  {
    questionKey: 'routine.post_wash_tight',
    title: '세안 후 당김·속건조를 느끼나요?',
    answers: ['있음', '없음'],
    screen: 'priority_gate',
    uiSection: 'life_routine',
    sortOrder: 60,
  },
  {
    questionKey: 'routine.daytime_oily',
    title: '낮에 얼굴이 번들거리나요?',
    answers: ['있음', '없음'],
    screen: 'priority_gate',
    uiSection: 'life_routine',
    sortOrder: 70,
  },
  {
    questionKey: 'routine.pillowcase_change',
    title: '베갯잇 마지막 교체가 언제인가요?',
    answers: ['1주 이내', '2주 이내', '한 달 이상', '모름'],
    screen: 'priority_gate',
    uiSection: 'life_routine',
    sortOrder: 80,
  },
  {
    questionKey: 'routine.brush_wash',
    title: '브러시·퍼프 마지막 세척·교체가 언제인가요?',
    answers: ['2주 이내', '한 달 이내', '그 이상·모름', '도구 안 씀'],
    screen: 'priority_gate',
    uiSection: 'life_routine',
    sortOrder: 90,
  },
  {
    questionKey: 'routine.overapply',
    title: '썬크림·보습제를 권장량보다 많이 바르거나 여러 겹 겹쳐 바르는 편인가요?',
    answers: ['예', '아니오'],
    screen: 'priority_gate',
    uiSection: 'life_routine',
    sortOrder: 100,
  },
  // 트러블·치료 --------------------------------------------------------
  {
    questionKey: 'diagnosis.skin_problems',
    title: '지금 겪는 피부 문제가 있나요?',
    answers: [
      '심한 여드름(피부과 치료가 필요한 정도)',
      '흉터',
      '사마귀',
      '주사(만성 붉어짐)',
      '아토피·습진',
      '없음',
    ],
    screen: 'priority_gate',
    uiSection: 'life_routine',
    sortOrder: 110,
  },
  {
    questionKey: 'diagnosis.hormonal_pattern',
    title: '얼굴 하부 1/3(턱 라인)에 좁쌀이 몰리거나 생리주기와 연동되나요?',
    answers: ['예', '아니오'],
    screen: 'priority_gate',
    uiSection: 'life_routine',
    sortOrder: 120,
  },
  {
    questionKey: 'diagnosis.acne_patch',
    title: '여드름 상처에 여드름 패치를 쓰나요?',
    answers: ['예', '아니오'],
    screen: 'priority_gate',
    uiSection: 'life_routine',
    sortOrder: 130,
  },
  {
    questionKey: 'diagnosis.treatment_status',
    title: '다음 중 해당하는 게 있나요?',
    answers: [
      '피부과 처방 치료 중',
      '미용 시술(레이저 등) 받는 중',
      '약국 여드름약 사용 중',
      '해당 없음',
    ],
    screen: 'priority_gate',
    uiSection: 'life_routine',
    sortOrder: 140,
  },
  // 개선 목적 ----------------------------------------------------------
  {
    questionKey: 'goal.improve',
    title: '개선하고 싶은 부분이 있나요?',
    answers: [
      '노화(주름·탄력 저하)',
      '각질(화이트헤드·블랙헤드)',
      '피지 분비',
      '미백·안색 개선',
      '없음',
    ],
    screen: 'priority_gate',
    uiSection: 'life_routine',
    sortOrder: 150,
  },
  // 사용제품 -----------------------------------------------------------
  {
    questionKey: 'product.cleanser_type',
    title: '기초 세안 제품(폼·젤 등)으로 무엇을 쓰나요?',
    answers: ['폼/젤', '비누', '없음(물세안)'],
    screen: 'priority_gate',
    uiSection: 'owned_products',
    sortOrder: 10,
  },
  {
    questionKey: 'product.cleanser_ph',
    title: '클렌저 pH는?',
    answers: ['약산성', '알칼리성(비누 포함)', '모름'],
    screen: 'priority_gate',
    uiSection: 'owned_products',
    sortOrder: 20,
  },
  {
    questionKey: 'product.cleanser_exfoliant',
    title: '클렌저의 각질·여드름 성분은?',
    answers: ['BHA(살리실산)', '스크럽(물리)', '없음', '모름'],
    screen: 'priority_gate',
    uiSection: 'owned_products',
    sortOrder: 30,
  },
  {
    questionKey: 'product.first_cleanser',
    title: '2차 세안을 한다면, 1차 클렌저로 무엇을 쓰나요?',
    answers: ['워터/미셀라워터', '밀크', '밤/오일', '2차 세안 안 함'],
    screen: 'priority_gate',
    uiSection: 'owned_products',
    sortOrder: 40,
  },
  {
    questionKey: 'product.cleanse_residue',
    title: '세안 후에도 썬크림·메이크업 잔여감이 남나요?',
    answers: ['예', '아니오'],
    screen: 'priority_gate',
    uiSection: 'owned_products',
    sortOrder: 50,
  },
  {
    questionKey: 'product.toner_type',
    title: '토너 유형은?',
    answers: [
      '안 씀',
      '모름',
      '수분·진정 계열',
      '산·각질 계열(AHA/BHA 등)',
      'PDRN·콜라겐·추출물 등',
    ],
    screen: 'priority_gate',
    uiSection: 'owned_products',
    sortOrder: 60,
  },
  {
    questionKey: 'product.layer_count',
    title: '기초 단계를 몇 겹으로 바르나요?',
    answers: ['1겹', '2겹', '3겹', '4겹', '6겹', '7겹', '8겹 이상'],
    screen: 'priority_gate',
    uiSection: 'owned_products',
    sortOrder: 70,
  },
  {
    questionKey: 'product.serum_count',
    title: '현재 사용 중인 세럼 개수는?',
    answers: ['0개', '1개', '2개 이상'],
    screen: 'priority_gate',
    uiSection: 'owned_products',
    sortOrder: 80,
  },
  {
    questionKey: 'product.serum_actives',
    title: '세럼 활성 성분은? (복수 선택)',
    answers: [
      '레티노이드 계열',
      '비타민C',
      '나이아신아마이드',
      'AHA/BHA',
      '트라넥삼산',
      '아젤라익',
      '펩타이드·아데노신',
      '마데카소사이드·센텔라',
      'PDRN·콜라겐·글루타치온',
      '모름·기타',
      '안 씀',
    ],
    screen: 'priority_gate',
    uiSection: 'owned_products',
    sortOrder: 90,
  },
  {
    questionKey: 'product.serum_frequency',
    title: '세럼 사용 주기는?',
    answers: ['매일', '주 2~3회', '가끔'],
    screen: 'priority_gate',
    uiSection: 'owned_products',
    sortOrder: 100,
  },
  {
    questionKey: 'product.moisturizer_type',
    title: '보습제 (로션, 크림 등) 보유·제형은?',
    answers: ['젤/워터젤', '로션', '수분크림', '영양크림', '재생크림', '여러 개 사용', '없음'],
    screen: 'priority_gate',
    uiSection: 'owned_products',
    sortOrder: 110,
  },
  {
    questionKey: 'product.moisturizer_functional',
    title: '보습제 기능성 여부는?',
    answers: ['나이아신아마이드 등 포함', '순수 보습', '모름'],
    screen: 'priority_gate',
    uiSection: 'owned_products',
    sortOrder: 120,
  },
  {
    questionKey: 'product.sunscreen_type',
    title: '자차(선크림) 타입은?',
    answers: ['유기자차', '무기자차', '혼합', '안 씀', '모름'],
    screen: 'priority_gate',
    uiSection: 'owned_products',
    sortOrder: 130,
  },
  {
    questionKey: 'product.outdoor_range',
    title: '낮 시간 야외 활동·행동 반경은?',
    answers: [
      '거의 실내',
      '출퇴근 정도',
      '하루 몇 시간 야외',
      '운동선수·현장직·장시간 야외활동·심한 땀',
    ],
    screen: 'priority_gate',
    uiSection: 'owned_products',
    sortOrder: 140,
  },
  {
    questionKey: 'product.sunscreen_reapply',
    title: '외출 시 덧바르나요?',
    answers: ['예', '아니오'],
    screen: 'priority_gate',
    uiSection: 'owned_products',
    sortOrder: 150,
  },
  {
    questionKey: 'product.white_cast_complaint',
    title: '백탁·발림성이 불만인가요?',
    answers: ['예', '아니오'],
    screen: 'priority_gate',
    uiSection: 'owned_products',
    sortOrder: 160,
  },
  {
    questionKey: 'product.eye_sting',
    title: '눈시림·자극을 느끼나요?',
    answers: ['예', '아니오'],
    screen: 'priority_gate',
    uiSection: 'owned_products',
    sortOrder: 170,
  },
] as const satisfies readonly QuestionVariantSeed[];

// 구매 체크리스트(screen=context) 변형 배치 — docs/ContentSpec/purchase_checklist_v1.md §1 역추적 결과.
// 문구·선택지는 priority_gate 변형과 동일(재탕)하며 배치(섹션·카테고리·순서)만 정의한다.
// basic = 게이트·피부 상태(공통 Q-D1·Q-D5는 category=null로 전 카테고리 노출), category = 제품·목적 질문.
const CHECKLIST_QUESTION_VARIANT_PLACEMENTS: readonly {
  questionKey: string;
  uiSection: 'basic' | 'category';
  category: SeedCategoryKey | null;
  sortOrder: number;
}[] = [
  // 공통 게이트(룰 010·020 + 티어 EXCLUDED)
  { questionKey: 'diagnosis.skin_problems', uiSection: 'basic', category: null, sortOrder: 10 },
  { questionKey: 'diagnosis.treatment_status', uiSection: 'basic', category: null, sortOrder: 20 },
  // 클렌저
  {
    questionKey: 'routine.recent_irritation',
    uiSection: 'basic',
    category: 'cleanser',
    sortOrder: 30,
  },
  {
    questionKey: 'routine.makeup_frequency',
    uiSection: 'basic',
    category: 'cleanser',
    sortOrder: 40,
  },
  { questionKey: 'routine.daytime_oily', uiSection: 'basic', category: 'cleanser', sortOrder: 50 },
  {
    questionKey: 'product.cleanser_type',
    uiSection: 'category',
    category: 'cleanser',
    sortOrder: 10,
  },
  {
    questionKey: 'product.cleanser_ph',
    uiSection: 'category',
    category: 'cleanser',
    sortOrder: 20,
  },
  {
    questionKey: 'product.cleanser_exfoliant',
    uiSection: 'category',
    category: 'cleanser',
    sortOrder: 30,
  },
  {
    questionKey: 'product.first_cleanser',
    uiSection: 'category',
    category: 'cleanser',
    sortOrder: 40,
  },
  {
    questionKey: 'product.cleanse_residue',
    uiSection: 'category',
    category: 'cleanser',
    sortOrder: 50,
  },
  // 토너
  {
    questionKey: 'routine.recent_irritation',
    uiSection: 'basic',
    category: 'toner',
    sortOrder: 30,
  },
  { questionKey: 'routine.post_wash_tight', uiSection: 'basic', category: 'toner', sortOrder: 40 },
  { questionKey: 'product.toner_type', uiSection: 'category', category: 'toner', sortOrder: 10 },
  {
    questionKey: 'product.moisturizer_type',
    uiSection: 'category',
    category: 'toner',
    sortOrder: 20,
  },
  { questionKey: 'product.serum_actives', uiSection: 'category', category: 'toner', sortOrder: 30 },
  // 세럼
  {
    questionKey: 'routine.recent_irritation',
    uiSection: 'basic',
    category: 'serum',
    sortOrder: 30,
  },
  { questionKey: 'product.serum_actives', uiSection: 'category', category: 'serum', sortOrder: 10 },
  { questionKey: 'product.toner_type', uiSection: 'category', category: 'serum', sortOrder: 20 },
  { questionKey: 'goal.improve', uiSection: 'category', category: 'serum', sortOrder: 30 },
  {
    questionKey: 'product.sunscreen_type',
    uiSection: 'category',
    category: 'serum',
    sortOrder: 40,
  },
  // 로션·크림
  {
    questionKey: 'routine.post_wash_tight',
    uiSection: 'basic',
    category: 'moisturizer',
    sortOrder: 30,
  },
  {
    questionKey: 'routine.daytime_oily',
    uiSection: 'basic',
    category: 'moisturizer',
    sortOrder: 40,
  },
  {
    questionKey: 'product.moisturizer_type',
    uiSection: 'category',
    category: 'moisturizer',
    sortOrder: 10,
  },
  // 썬크림
  {
    questionKey: 'routine.recent_irritation',
    uiSection: 'basic',
    category: 'sunscreen',
    sortOrder: 30,
  },
  {
    questionKey: 'routine.post_wash_tight',
    uiSection: 'basic',
    category: 'sunscreen',
    sortOrder: 40,
  },
  { questionKey: 'routine.daytime_oily', uiSection: 'basic', category: 'sunscreen', sortOrder: 50 },
  {
    questionKey: 'routine.makeup_frequency',
    uiSection: 'basic',
    category: 'sunscreen',
    sortOrder: 60,
  },
  {
    questionKey: 'product.sunscreen_type',
    uiSection: 'category',
    category: 'sunscreen',
    sortOrder: 10,
  },
  {
    questionKey: 'product.outdoor_range',
    uiSection: 'category',
    category: 'sunscreen',
    sortOrder: 20,
  },
  {
    questionKey: 'product.sunscreen_reapply',
    uiSection: 'category',
    category: 'sunscreen',
    sortOrder: 30,
  },
  {
    questionKey: 'product.white_cast_complaint',
    uiSection: 'category',
    category: 'sunscreen',
    sortOrder: 40,
  },
  { questionKey: 'product.eye_sting', uiSection: 'category', category: 'sunscreen', sortOrder: 50 },
  {
    questionKey: 'product.first_cleanser',
    uiSection: 'category',
    category: 'sunscreen',
    sortOrder: 60,
  },
  {
    questionKey: 'product.cleanse_residue',
    uiSection: 'category',
    category: 'sunscreen',
    sortOrder: 70,
  },
  { questionKey: 'goal.improve', uiSection: 'category', category: 'sunscreen', sortOrder: 80 },
];

const CHECKLIST_QUESTION_VARIANT_SEEDS: readonly QuestionVariantSeed[] =
  CHECKLIST_QUESTION_VARIANT_PLACEMENTS.map((placement) => {
    const base = PRIORITY_GATE_QUESTION_VARIANT_SEEDS.find(
      (variant) => variant.questionKey === placement.questionKey,
    );

    if (!base) {
      throw new Error(`Missing priority_gate variant for ${placement.questionKey}`);
    }

    return {
      questionKey: placement.questionKey,
      title: base.title,
      answers: base.answers,
      screen: 'context',
      uiSection: placement.uiSection,
      category: placement.category,
      sortOrder: placement.sortOrder,
    };
  });

export const QUESTION_VARIANT_SEEDS: readonly QuestionVariantSeed[] = [
  ...PRIORITY_GATE_QUESTION_VARIANT_SEEDS,
  ...CHECKLIST_QUESTION_VARIANT_SEEDS,
];

// Q-D3(호르몬 패턴)은 여성에게만 노출한다. 변형을 (screen, uiSection, sortOrder)로 식별한다.
export const QUESTION_VISIBILITY_CONDITION_SEEDS = [
  {
    targetQuestionKey: 'diagnosis.hormonal_pattern',
    targetScreen: 'priority_gate',
    targetUiSection: 'life_routine',
    targetSortOrder: 120,
    conditionQuestionKey: 'demographic.gender',
    operator: 'EQ',
    value: 1,
    state: 'REQUIRED',
  },
] as const satisfies readonly QuestionVisibilityConditionSeed[];
