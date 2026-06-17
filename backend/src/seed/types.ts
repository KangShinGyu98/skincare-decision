export type SeedCategoryKey =
  | 'toner'
  | 'sunscreen'
  | 'serum'
  | 'lipcare'
  | 'moisturizer'
  | 'cleanser';

export type SeedValueType = 'BOOLEAN' | 'ENUM' | 'NUMBER' | 'MULTI_ENUM' | 'STRING';

export type SeedComparisonOperator = 'EQ' | 'IN' | 'CONTAINS' | 'GTE' | 'LTE' | 'NEQ';

export type SeedInputType = 'NUMBER' | 'SELECT' | 'MULTI_SELECT' | 'BOOLEAN';

export type SeedQuestionAnswerType =
  | 'BOOLEAN'
  | 'THREE_CHOICE'
  | 'FOUR_CHOICE'
  | 'FIVE_CHOICE'
  | 'SINGLE_CHOICE'
  | 'MULTI_CHOICE';

export type SeedQuestionVariantScreen = 'priority_gate' | 'context';

export type SeedQuestionVariantUiSection = 'life_routine' | 'owned_products' | 'basic' | 'category';

export type SeedPriorityRuleResultType = 'STOP' | 'HOLD' | 'CAUTION' | 'PASS' | 'ROUTE_CATEGORY';

export interface ProductCategorySeed {
  key: SeedCategoryKey;
  name: string;
  description: string;
}

export interface CategoryAttributeSeed {
  categoryKey: SeedCategoryKey;
  key: string;
  label: string;
  valueType: SeedValueType;
  options?: readonly string[];
  isRequired: boolean;
  sortOrder: number;
}

export interface QuestionSeed {
  key: string;
  answerType: SeedQuestionAnswerType;
  answerValues: readonly number[];
}

export interface QuestionVariantSeed {
  questionKey: string;
  title: string;
  answers: readonly string[];
  screen: SeedQuestionVariantScreen;
  uiSection: SeedQuestionVariantUiSection;
  sortOrder: number;
}

export interface PriorityRuleConditionSeed {
  questionKey: string;
  operator: SeedComparisonOperator;
  value: readonly number[];
  state: 'REQUIRED' | 'EXCLUDED';
}

export interface PriorityRuleSeed {
  key: string;
  name: string;
  priority: number;
  resultType: SeedPriorityRuleResultType;
  resultTitle: string;
  resultDescription: string;
  holdCategories?: readonly SeedCategoryKey[];
  recommendCategoryKey?: SeedCategoryKey;
  ctaLabel?: string;
  ctaTarget?: string;
  conditions: readonly PriorityRuleConditionSeed[];
}

export interface ProductFilterSeed {
  categoryKey: SeedCategoryKey;
  attributeKey: string;
  label: string;
  defaultOperator: SeedComparisonOperator;
  allowedOperators: readonly SeedComparisonOperator[];
  defaultValue: unknown;
  inputType: SeedInputType;
  options?: readonly string[];
  sortOrder: number;
}

export interface ProductMatrixFilterSeed {
  categoryKey: SeedCategoryKey;
  key: string;
  label: string;
  definitionKind: 'ATTRIBUTE' | 'COMPUTED';
  attributeKey?: string;
  computedFilterKey?: string;
  operatorOverride?: SeedComparisonOperator;
  valueOverride?: unknown;
  conditionPayload?: unknown;
  isDefault: boolean;
  isManualSelectable: boolean;
  sortOrder: number;
}

export interface QuestionFilterMappingSeed {
  triggerQuestionKey: string;
  triggerOperator: SeedComparisonOperator;
  triggerValue: readonly number[];
  categoryKey: SeedCategoryKey;
  matrixFilterKey: string;
}

export interface IngredientGroupSeed {
  key: string;
  name: string;
  description: string;
}

export interface TonerAttributesSeed {
  form: 'water' | 'viscous' | 'milky' | 'pad' | 'mist';
  application_methods: readonly ('wipe' | 'press' | 'pack' | 'mist')[];
  role_tags: readonly ('hydration' | 'calming' | 'exfoliation' | 'oil_control' | 'barrier')[];
  ph_label: 'strong_acidic' | 'weak_acidic' | 'mild_acidic' | 'neutral' | 'unknown';
  ph_value?: number;
  irritation_risk: 'low' | 'medium' | 'high';
  exfoliation_type: 'none' | 'aha' | 'bha' | 'pha' | 'lha' | 'enzyme' | 'mixed';
  alcohol: boolean;
  fragrance: boolean;
  astringent_level: 'none' | 'low' | 'medium' | 'high';
  oil_control: 'none' | 'low' | 'medium' | 'high';
  active_ingredients: readonly string[];
  absorption_speed: 'slow' | 'medium' | 'fast';
  layer_compatibility: 'good' | 'fair' | 'poor';
  photosensitive: boolean;
  recommended_frequency: 'daily' | 'weekly_1_3' | 'as_needed';
}

export interface TonerProductSeed {
  brandName: string;
  name: string;
  priceKrw: number;
  volumeAmount?: string;
  volumeUnit?: 'ML' | 'G' | 'L' | 'MG';
  volumeLabel: string;
  imageUrl: null;
  purchaseUrl: string;
  attributes: TonerAttributesSeed;
  ingredientNames: readonly string[];
  sortOrder: number;
  isActive: boolean;
}
