import type { NationState, NewsItem, NewsSection, NewsTone } from '@/types';
import { ACTION_LABELS } from '@/config/diplomacy';
import type { DiplomaticAction } from '@/types';
import { round, safe } from '../math';
import type { Rng } from '../rng';

export interface NewsInput {
  turn: number;
  year: number;
  quarter: number;
  before: NationState;
  after: NationState;
  /** 이번 턴에 발생한 이벤트 제목. */
  eventTitles: readonly string[];
  diplomacy: readonly DiplomaticAction[];
  warReports: readonly string[];
  countryNames: Record<string, string>;
}

interface Draft {
  headline: string;
  body: string;
  tone: NewsTone;
  section: NewsSection;
}

function pct(value: number): string {
  return `${value >= 0 ? '+' : ''}${round(value, 1)}%`;
}

function economyDraft(input: NewsInput, rng: Rng): Draft {
  const { after, before } = input;
  const growth = after.economy.gdpGrowth;
  const inflation = after.economy.inflation;
  const unemployment = after.economy.unemployment;
  const growthDelta = growth - before.economy.gdpGrowth;

  if (growth < -1) {
    return {
      headline: rng.pick([
        `${input.year}년 ${input.quarter}분기 경제 역성장, 연율 ${round(growth, 1)}%`,
        `경기 침체 국면 진입… 성장률 ${round(growth, 1)}%`,
      ]),
      body: `내수와 투자가 동시에 위축되며 성장률이 ${round(growth, 1)}%로 집계됐습니다. 실업률은 ${round(unemployment, 1)}%입니다.`,
      tone: 'bad',
      section: 'economy',
    };
  }

  if (inflation > 5) {
    return {
      headline: rng.pick([
        `물가상승률 ${round(inflation, 1)}%… 장바구니 부담 가중`,
        `고물가 지속, 소비자물가 ${round(inflation, 1)}% 상승`,
      ]),
      body: `생활물가 상승이 이어지며 실질 구매력이 줄고 있습니다. 기준금리는 ${round(after.policy.policyRate, 2)}% 입니다.`,
      tone: 'bad',
      section: 'economy',
    };
  }

  if (growth > 3.5) {
    return {
      headline: rng.pick([
        `성장률 ${round(growth, 1)}%… 시장 예상 상회`,
        `${input.quarter}분기 경제 확장세, 성장률 ${round(growth, 1)}%`,
      ]),
      body: `투자와 수출이 함께 늘며 확장 국면이 이어지고 있습니다. 전분기 대비 ${pct(growthDelta)}p 개선됐습니다.`,
      tone: 'good',
      section: 'economy',
    };
  }

  return {
    headline: `${input.year}년 ${input.quarter}분기 성장률 ${round(growth, 1)}%, 물가 ${round(inflation, 1)}%`,
    body: `실업률 ${round(unemployment, 1)}%, 기준금리 ${round(after.policy.policyRate, 2)}%. 경기는 완만한 흐름을 이어가고 있습니다.`,
    tone: 'neutral',
    section: 'economy',
  };
}

function fiscalDraft(input: NewsInput): Draft | null {
  const { after, before } = input;
  const debtDelta = after.fiscal.debtToGdp - before.fiscal.debtToGdp;

  if (after.fiscal.debtToGdp > 150 && debtDelta > 0.5) {
    return {
      headline: `국가부채 비율 ${round(after.fiscal.debtToGdp, 0)}% 돌파`,
      body: `재정수지 적자가 이어지며 부채 비율이 ${round(debtDelta, 1)}%p 상승했습니다. 조달금리는 ${round(after.fiscal.interestRate, 2)}% 입니다.`,
      tone: 'bad',
      section: 'politics',
    };
  }

  if (after.fiscal.balance > 0 && before.fiscal.balance <= 0) {
    return {
      headline: '재정수지 흑자 전환',
      body: `세입이 지출을 웃돌며 재정이 흑자로 돌아섰습니다. 부채 비율은 ${round(after.fiscal.debtToGdp, 0)}% 입니다.`,
      tone: 'good',
      section: 'politics',
    };
  }

  return null;
}

function societyDraft(input: NewsInput): Draft | null {
  const { after, before } = input;
  const popDelta = after.population.total - before.population.total;

  if (
    popDelta < 0 &&
    before.population.total - after.population.total > after.population.total * 0.0004
  ) {
    return {
      headline: '인구 자연감소 지속',
      body: `합계출산율 ${round(after.population.fertilityRate, 2)}, 고령인구 비율 ${round(after.population.elderlyShare, 1)}%. 생산가능인구 감소가 이어지고 있습니다.`,
      tone: 'bad',
      section: 'society',
    };
  }

  if (after.population.fertilityRate - before.population.fertilityRate > 0.008) {
    return {
      headline: `출산율 반등, ${round(after.population.fertilityRate, 2)}명`,
      body: '정책 효과가 나타나며 출생아 수가 늘었습니다. 다만 추세 전환 여부는 좀 더 지켜봐야 합니다.',
      tone: 'good',
      section: 'society',
    };
  }

  return null;
}

function approvalDraft(input: NewsInput): Draft | null {
  const delta = input.after.politics.approval - input.before.politics.approval;
  if (Math.abs(delta) < 1.5) return null;

  const rising = delta > 0;
  return {
    headline: `국정 지지율 ${round(input.after.politics.approval, 0)}%, ${rising ? '상승' : '하락'}`,
    body: `전분기 대비 ${pct(delta)}p ${rising ? '올랐습니다' : '내렸습니다'}. 정치 안정성 지수는 ${round(input.after.politics.stability, 0)} 입니다.`,
    tone: rising ? 'good' : 'bad',
    section: 'politics',
  };
}

export function generateNews(input: NewsInput, rng: Rng): NewsItem[] {
  const drafts: Draft[] = [economyDraft(input, rng)];

  const fiscal = fiscalDraft(input);
  if (fiscal) drafts.push(fiscal);

  const society = societyDraft(input);
  if (society) drafts.push(society);

  const approval = approvalDraft(input);
  if (approval) drafts.push(approval);

  for (const title of input.eventTitles) {
    drafts.push({
      headline: title,
      body: '정부는 관계부처 합동 대응에 나섰습니다.',
      tone: 'neutral',
      section: 'society',
    });
  }

  for (const action of input.diplomacy) {
    const actorName = input.countryNames[action.actor] ?? action.actor;
    const targetName = input.countryNames[action.target] ?? action.target;
    const hostile = action.type === 'sanction' || action.type === 'threaten';
    drafts.push({
      headline: `${actorName}, ${targetName}에 ${ACTION_LABELS[action.type]}`,
      body: `${actorName}이(가) ${targetName}을(를) 상대로 ${ACTION_LABELS[action.type]}을(를) 공식화했습니다.`,
      tone: hostile ? 'bad' : 'neutral',
      section: 'world',
    });
  }

  for (const report of input.warReports) {
    drafts.push({
      headline: report,
      body: '국방부는 상황을 예의주시하고 있다고 밝혔습니다.',
      tone: 'bad',
      section: 'defense',
    });
  }

  return drafts.map((draft, index) => ({
    id: `${input.turn}-${index}`,
    turn: input.turn,
    headline: draft.headline,
    body: draft.body,
    tone: draft.tone,
    section: draft.section,
  }));
}

/** 뉴스 피드 길이를 제한한다. */
export function trimNews(items: readonly NewsItem[], max: number): NewsItem[] {
  if (items.length <= max) return [...items];
  return items.slice(items.length - max);
}

export function formatQuarter(turn: number, startYear: number): { year: number; quarter: number } {
  const year = startYear + Math.floor(safe(turn) / 4);
  const quarter = (Math.floor(safe(turn)) % 4) + 1;
  return { year, quarter };
}
