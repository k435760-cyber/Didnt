import type { CountryId, GameState, NationState } from '@/types';
import { COUNTRY_IDS } from '@/types/country';
import { getRelation } from '@/simulation/diplomacy/relations';

/**
 * 지표를 사람이 읽는 상태 표현으로 옮기는 UI 전용 파생 계층.
 *
 * 여기서 만드는 값은 화면 표시에만 쓰이며 시뮬레이션에 되돌아가지 않는다.
 * 임계값은 전부 이 파일 한 곳에 모아 두고, 각 함수는 순수 함수다.
 */

export type Tone = 'good' | 'steady' | 'watch' | 'risk';

export interface Assessment {
  label: string;
  tone: Tone;
}

export const TONE_COLOR: Record<Tone, string> = {
  good: 'var(--color-positive)',
  steady: 'var(--color-ink-muted)',
  watch: 'var(--color-caution)',
  risk: 'var(--color-negative)',
};

interface Band {
  /** 이 값 이상이면 해당 구간. 내림차순으로 정렬해 둔다. */
  min: number;
  label: string;
  tone: Tone;
}

function classify(value: number, bands: readonly Band[]): Assessment {
  if (!Number.isFinite(value)) return { label: '—', tone: 'steady' };
  for (const band of bands) {
    if (value >= band.min) return { label: band.label, tone: band.tone };
  }
  const last = bands[bands.length - 1];
  return last ? { label: last.label, tone: last.tone } : { label: '—', tone: 'steady' };
}

const GROWTH: Band[] = [
  { min: 3.5, label: '고성장', tone: 'good' },
  { min: 2, label: '견조', tone: 'good' },
  { min: 0.8, label: '완만', tone: 'steady' },
  { min: 0, label: '정체', tone: 'watch' },
  { min: -Infinity, label: '침체', tone: 'risk' },
];

const INFLATION: Band[] = [
  { min: 6, label: '과열', tone: 'risk' },
  { min: 4, label: '상승 압력', tone: 'watch' },
  { min: 1, label: '안정', tone: 'good' },
  { min: 0, label: '낮음', tone: 'watch' },
  { min: -Infinity, label: '디플레 우려', tone: 'risk' },
];

const UNEMPLOYMENT: Band[] = [
  { min: 10, label: '심각', tone: 'risk' },
  { min: 7, label: '높음', tone: 'watch' },
  { min: 5, label: '보통', tone: 'steady' },
  { min: 3, label: '양호', tone: 'good' },
  { min: -Infinity, label: '매우 낮음', tone: 'good' },
];

const DEBT: Band[] = [
  { min: 150, label: '위험', tone: 'risk' },
  { min: 100, label: '높음', tone: 'watch' },
  { min: 70, label: '주의', tone: 'watch' },
  { min: 40, label: '안정', tone: 'steady' },
  { min: -Infinity, label: '건전', tone: 'good' },
];

const BALANCE: Band[] = [
  { min: 0, label: '흑자', tone: 'good' },
  { min: -3, label: '관리 가능', tone: 'steady' },
  { min: -6, label: '적자 확대', tone: 'watch' },
  { min: -Infinity, label: '재정 악화', tone: 'risk' },
];

const APPROVAL: Band[] = [
  { min: 60, label: '높음', tone: 'good' },
  { min: 45, label: '안정', tone: 'steady' },
  { min: 30, label: '불안', tone: 'watch' },
  { min: -Infinity, label: '위태', tone: 'risk' },
];

const STABILITY: Band[] = [
  { min: 75, label: '매우 안정', tone: 'good' },
  { min: 60, label: '안정', tone: 'steady' },
  { min: 45, label: '불안', tone: 'watch' },
  { min: -Infinity, label: '취약', tone: 'risk' },
];

const COMPETITIVENESS: Band[] = [
  { min: 80, label: '매우 강함', tone: 'good' },
  { min: 65, label: '강함', tone: 'good' },
  { min: 50, label: '보통', tone: 'steady' },
  { min: 35, label: '약함', tone: 'watch' },
  { min: -Infinity, label: '매우 약함', tone: 'risk' },
];

const EDUCATION: Band[] = [
  { min: 80, label: '최상위', tone: 'good' },
  { min: 65, label: '높음', tone: 'good' },
  { min: 50, label: '보통', tone: 'steady' },
  { min: -Infinity, label: '낮음', tone: 'watch' },
];

/** 에너지 의존도는 높을수록 나쁘다. */
const ENERGY: Band[] = [
  { min: 85, label: '매우 높음', tone: 'risk' },
  { min: 60, label: '높음', tone: 'watch' },
  { min: 35, label: '보통', tone: 'steady' },
  { min: -Infinity, label: '낮음', tone: 'good' },
];

const PRODUCTIVITY: Band[] = [
  { min: 110, label: '최상위', tone: 'good' },
  { min: 90, label: '높음', tone: 'good' },
  { min: 60, label: '보통', tone: 'steady' },
  { min: -Infinity, label: '낮음', tone: 'watch' },
];

const FERTILITY: Band[] = [
  { min: 2, label: '안정', tone: 'good' },
  { min: 1.5, label: '낮음', tone: 'watch' },
  { min: 1, label: '매우 낮음', tone: 'risk' },
  { min: -Infinity, label: '인구 위기', tone: 'risk' },
];

const RELATIONS: Band[] = [
  { min: 40, label: '우호적', tone: 'good' },
  { min: 10, label: '대체로 안정', tone: 'steady' },
  { min: -20, label: '긴장', tone: 'watch' },
  { min: -Infinity, label: '적대적', tone: 'risk' },
];

const MILITARY_RANK: Band[] = [
  { min: 7, label: '하위', tone: 'watch' },
  { min: 5, label: '중위', tone: 'steady' },
  { min: 3, label: '상위', tone: 'good' },
  { min: -Infinity, label: '최상위', tone: 'good' },
];

export const assessGrowth = (v: number) => classify(v, GROWTH);
export const assessInflation = (v: number) => classify(v, INFLATION);
export const assessUnemployment = (v: number) => classify(v, UNEMPLOYMENT);
export const assessDebt = (v: number) => classify(v, DEBT);
export const assessBalance = (ratioOfGdp: number) => classify(ratioOfGdp, BALANCE);
export const assessApproval = (v: number) => classify(v, APPROVAL);
export const assessStability = (v: number) => classify(v, STABILITY);
export const assessCompetitiveness = (v: number) => classify(v, COMPETITIVENESS);
export const assessEducation = (v: number) => classify(v, EDUCATION);
export const assessEnergy = (v: number) => classify(v, ENERGY);
export const assessProductivity = (v: number) => classify(v, PRODUCTIVITY);
export const assessFertility = (v: number) => classify(v, FERTILITY);
export const assessRelations = (averageRelation: number) => classify(averageRelation, RELATIONS);
/** 1위가 가장 강하다. 순위를 역방향 밴드에 맞춘다. */
export const assessMilitaryRank = (rank: number) => classify(rank, MILITARY_RANK);

export function balanceRatio(nation: NationState): number {
  return (nation.fiscal.balance / Math.max(nation.economy.gdp, 1)) * 100;
}

export function averageRelation(state: GameState): number {
  const others = COUNTRY_IDS.filter((id) => id !== state.playerCountry);
  if (others.length === 0) return 0;
  let total = 0;
  for (const id of others) total += getRelation(state.relations, state.playerCountry, id);
  return total / others.length;
}

export function militaryRank(state: GameState): number {
  const ranked = [...COUNTRY_IDS].sort(
    (a, b) => state.nations[b].military.power - state.nations[a].military.power,
  );
  return ranked.indexOf(state.playerCountry) + 1;
}

export interface BriefingItem {
  key: string;
  label: string;
  state: Assessment;
}

/** 국정 브리핑 5줄. 전부 현재 시뮬레이션 상태에서 파생한다. */
export function buildBriefing(state: GameState): BriefingItem[] {
  const nation = state.nations[state.playerCountry];
  const wars = state.wars.filter(
    (war) => war.attacker === state.playerCountry || war.defender === state.playerCountry,
  ).length;

  return [
    { key: 'economy', label: '경제', state: assessGrowth(nation.economy.gdpGrowth) },
    { key: 'prices', label: '물가', state: assessInflation(nation.economy.inflation) },
    { key: 'fiscal', label: '재정', state: assessBalance(balanceRatio(nation)) },
    { key: 'society', label: '사회', state: assessStability(nation.politics.stability) },
    {
      key: 'foreign',
      label: '외교',
      state:
        wars > 0
          ? { label: '교전 중', tone: 'risk' as Tone }
          : assessRelations(averageRelation(state)),
    },
  ];
}

export interface Concern {
  key: string;
  title: string;
  detail: string;
  tone: Exclude<Tone, 'good' | 'steady'>;
}

export interface ConcernInput {
  state: GameState;
  /** 최근 분기 대비 변화량. history 가 부족하면 0 을 넘긴다. */
  trend: { debtToGdp: number; approval: number; unemployment: number };
}

/**
 * 지금 신경 써야 할 현안.
 * 조건은 전부 현재 상태와 직전 분기 대비 변화에서 판정하며, 새 난수를 만들지 않는다.
 */
export function buildConcerns({ state, trend }: ConcernInput): Concern[] {
  const nation = state.nations[state.playerCountry];
  const { economy, fiscal, population, politics } = nation;
  const concerns: Concern[] = [];

  const wars = state.wars.filter(
    (war) => war.attacker === state.playerCountry || war.defender === state.playerCountry,
  );
  if (wars.length > 0) {
    concerns.push({
      key: 'war',
      title: '교전 상태',
      detail: `${wars.length}개국과 전쟁 중입니다. 매 분기 전비와 성장률 손실이 발생합니다.`,
      tone: 'risk',
    });
  }

  if (politics.approval < 30) {
    concerns.push({
      key: 'approval',
      title: '지지율 위태',
      detail: `${politics.approval.toFixed(0)}%. 장기간 이 수준이면 정권이 유지되지 않습니다.`,
      tone: 'risk',
    });
  }

  if (economy.inflation >= 5) {
    concerns.push({
      key: 'inflation',
      title: '물가 과열',
      detail: `연율 ${economy.inflation.toFixed(1)}%. 실질 구매력과 지지율이 함께 깎입니다.`,
      tone: 'risk',
    });
  } else if (economy.inflation < 0.5) {
    concerns.push({
      key: 'deflation',
      title: '물가 하락 압력',
      detail: `연율 ${economy.inflation.toFixed(1)}%. 소비와 투자가 뒤로 미뤄집니다.`,
      tone: 'watch',
    });
  }

  if (economy.unemployment >= 8) {
    concerns.push({
      key: 'unemployment',
      title: '실업률 높음',
      detail: `${economy.unemployment.toFixed(1)}%${trend.unemployment > 0.2 ? ', 상승 중' : ''}.`,
      tone: economy.unemployment >= 11 ? 'risk' : 'watch',
    });
  }

  if (fiscal.debtToGdp >= 90 || trend.debtToGdp > 0.6) {
    concerns.push({
      key: 'debt',
      title: fiscal.debtToGdp >= 150 ? '국가부채 위험 수준' : '국가부채 증가 중',
      detail: `GDP 대비 ${fiscal.debtToGdp.toFixed(0)}%, 조달금리 ${fiscal.interestRate.toFixed(2)}%.`,
      tone: fiscal.debtToGdp >= 150 ? 'risk' : 'watch',
    });
  }

  if (population.fertilityRate < 1.2) {
    concerns.push({
      key: 'fertility',
      title: '출산율 매우 낮음',
      detail: `합계출산율 ${population.fertilityRate.toFixed(2)}. 생산가능인구가 줄어 잠재성장률을 끌어내립니다.`,
      tone: population.fertilityRate < 0.9 ? 'risk' : 'watch',
    });
  }

  if (population.elderlyShare >= 25) {
    concerns.push({
      key: 'aging',
      title: '고령화 심화',
      detail: `고령인구 비율 ${population.elderlyShare.toFixed(1)}%. 복지·의료 지출 압력이 커집니다.`,
      tone: 'watch',
    });
  }

  if (economy.energyDependence >= 70) {
    concerns.push({
      key: 'energy',
      title: '에너지 해외 의존도 높음',
      detail: `${economy.energyDependence.toFixed(0)}/100. 원자재 가격 충격에 그대로 노출됩니다.`,
      tone: economy.energyDependence >= 85 ? 'risk' : 'watch',
    });
  }

  const sanctions = state.sanctions.filter((s) => s.on === state.playerCountry).length;
  if (sanctions > 0) {
    concerns.push({
      key: 'sanctions',
      title: '경제 제재',
      detail: `${sanctions}개국이 제재를 부과하고 있어 수출이 줄어듭니다.`,
      tone: 'watch',
    });
  }

  if (economy.gdpGrowth < 0) {
    concerns.push({
      key: 'recession',
      title: '경기 침체',
      detail: `성장률 ${economy.gdpGrowth.toFixed(1)}%. 세입 감소로 재정이 함께 나빠집니다.`,
      tone: 'risk',
    });
  }

  // 위험도가 높은 것부터, 최대 4개까지만 보여준다.
  return concerns.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'risk' ? -1 : 1)).slice(0, 4);
}

export function countryOf(state: GameState): { id: CountryId; nation: NationState } {
  return { id: state.playerCountry, nation: state.nations[state.playerCountry] };
}
