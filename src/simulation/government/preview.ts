import type { BudgetCategory, NationState } from '@/types';
import { BUDGET_LABELS } from '@/config/fiscal';
import { ECONOMY } from '@/config/economy';
import { safe } from '../math';

export type Horizon = '즉시' | '단기' | '중기' | '장기';
export type Direction = 'up' | 'down' | 'flat';
export type Magnitude = 'small' | 'medium' | 'large';

export interface PreviewEntry {
  horizon: Horizon;
  label: string;
  direction: Direction;
  magnitude: Magnitude;
}

export interface PolicyPreview {
  /** 확정적으로 계산 가능한 값(재정지출 변화 등)만 숫자로 보여준다. */
  certain: { label: string; value: string }[];
  entries: PreviewEntry[];
}

function magnitudeOf(delta: number, unit: number): Magnitude {
  const size = Math.abs(delta) / unit;
  if (size >= 2) return 'large';
  if (size >= 0.8) return 'medium';
  return 'small';
}

function dir(delta: number, invert = false): Direction {
  if (Math.abs(delta) < 1e-9) return 'flat';
  const up = delta > 0;
  return (invert ? !up : up) ? 'up' : 'down';
}

/** 예산 항목별로 어떤 지표가 어느 방향으로 움직이는지. 크기는 변화폭에서 결정된다. */
const BUDGET_OUTCOMES: Record<
  BudgetCategory,
  { horizon: Horizon; label: string; invert?: boolean }[]
> = {
  welfare: [
    { horizon: '단기', label: '지지율' },
    { horizon: '단기', label: '민간 소비' },
    { horizon: '중기', label: '구조적 실업률' },
    { horizon: '장기', label: '출산율' },
  ],
  education: [
    { horizon: '중기', label: '교육 수준' },
    { horizon: '장기', label: '노동생산성' },
    { horizon: '장기', label: '잠재성장률' },
    { horizon: '중기', label: '구조적 실업률', invert: true },
  ],
  defense: [
    { horizon: '단기', label: '군사력' },
    { horizon: '단기', label: '군사 준비도' },
    { horizon: '중기', label: '민간 투자', invert: true },
  ],
  healthcare: [
    { horizon: '단기', label: '지지율' },
    { horizon: '장기', label: '기대수명' },
    { horizon: '장기', label: '고령인구 비율' },
  ],
  security: [
    { horizon: '단기', label: '정치 안정성' },
    { horizon: '단기', label: '지지율' },
  ],
  infrastructure: [
    { horizon: '중기', label: '노동생산성' },
    { horizon: '중기', label: '산업 경쟁력' },
  ],
  research: [
    { horizon: '중기', label: '노동생산성' },
    { horizon: '중기', label: '산업 경쟁력' },
    { horizon: '단기', label: '민간 투자' },
    { horizon: '중기', label: '군사 기술' },
  ],
  environment: [
    { horizon: '장기', label: '기대수명' },
    { horizon: '단기', label: '지지율' },
    { horizon: '중기', label: '산업 경쟁력', invert: true },
  ],
  industry: [
    { horizon: '중기', label: '산업 경쟁력' },
    { horizon: '중기', label: '수출' },
  ],
};

export function previewBudgetChange(
  category: BudgetCategory,
  from: number,
  to: number,
  nation: NationState,
): PolicyPreview {
  const delta = safe(to) - safe(from);
  if (Math.abs(delta) < 0.05) return { certain: [], entries: [] };

  // 내부 금액 단위는 10억 USD. 억 달러로 보여주려면 ×10.
  const spendingDelta = (delta / 100) * nation.economy.gdp * 10;
  const certain = [
    {
      label: '연간 재정지출',
      value: `${spendingDelta >= 0 ? '+' : ''}${Math.round(spendingDelta).toLocaleString('ko-KR')}억 달러 (GDP 대비 ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%p)`,
    },
  ];

  const entries: PreviewEntry[] = BUDGET_OUTCOMES[category].map((outcome) => ({
    horizon: outcome.horizon,
    label: outcome.label,
    direction: dir(delta, outcome.invert),
    magnitude: magnitudeOf(delta, 1.5),
  }));

  entries.push({
    horizon: '즉시',
    label: '재정수지',
    direction: dir(delta, true),
    magnitude: magnitudeOf(delta, 1.5),
  });

  return { certain, entries };
}

export function previewTaxChange(
  kind: 'income' | 'corporate' | 'consumption',
  from: number,
  to: number,
): PolicyPreview {
  const delta = safe(to) - safe(from);
  const entries: PreviewEntry[] = [];
  const unit = 3;

  if (Math.abs(delta) < 0.05) return { certain: [], entries: [] };

  entries.push({
    horizon: '즉시',
    label: '정부 세입',
    direction: dir(delta),
    magnitude: magnitudeOf(delta, unit),
  });
  entries.push({
    horizon: '단기',
    label: '지지율',
    direction: dir(delta, true),
    magnitude: magnitudeOf(delta, unit),
  });

  if (kind === 'income') {
    entries.push({
      horizon: '단기',
      label: '민간 소비',
      direction: dir(delta, true),
      magnitude: magnitudeOf(delta, unit),
    });
    entries.push({
      horizon: '중기',
      label: 'GDP 성장률',
      direction: dir(delta, true),
      magnitude: magnitudeOf(delta, unit * 1.4),
    });
  }

  if (kind === 'corporate') {
    entries.push({
      horizon: '단기',
      label: '기업 투자',
      direction: dir(delta, true),
      magnitude: magnitudeOf(delta, unit),
    });
    entries.push({
      horizon: '중기',
      label: '산업 경쟁력',
      direction: dir(delta, true),
      magnitude: magnitudeOf(delta, unit),
    });
    entries.push({
      horizon: '중기',
      label: 'GDP 성장률',
      direction: dir(delta, true),
      magnitude: magnitudeOf(delta, unit * 1.2),
    });
  }

  if (kind === 'consumption') {
    entries.push({
      horizon: '즉시',
      label: '물가상승률',
      direction: dir(delta),
      magnitude: magnitudeOf(delta, unit),
    });
    entries.push({
      horizon: '단기',
      label: '민간 소비',
      direction: dir(delta, true),
      magnitude: magnitudeOf(delta, unit),
    });
  }

  const referenceGap = safe(to) - ECONOMY.referenceTax[kind];
  const certain =
    Math.abs(referenceGap) > 8
      ? [
          {
            label: '주의',
            value: `국제 평균 대비 ${referenceGap > 0 ? '높은' : '낮은'} 수준입니다 (기준 ${ECONOMY.referenceTax[kind]}%).`,
          },
        ]
      : [];

  return { certain, entries };
}

export function previewRateChange(from: number, to: number): PolicyPreview {
  const delta = safe(to) - safe(from);
  if (Math.abs(delta) < 0.01) return { certain: [], entries: [] };

  const unit = 1;
  return {
    certain: [],
    entries: [
      {
        horizon: '단기',
        label: '물가상승률',
        direction: dir(delta, true),
        magnitude: magnitudeOf(delta, unit),
      },
      {
        horizon: '단기',
        label: '민간 소비',
        direction: dir(delta, true),
        magnitude: magnitudeOf(delta, unit),
      },
      {
        horizon: '단기',
        label: '기업 투자',
        direction: dir(delta, true),
        magnitude: magnitudeOf(delta, unit),
      },
      {
        horizon: '중기',
        label: '실업률',
        direction: dir(delta),
        magnitude: magnitudeOf(delta, unit),
      },
      {
        horizon: '중기',
        label: '국채 조달금리',
        direction: dir(delta),
        magnitude: magnitudeOf(delta, unit),
      },
    ],
  };
}

export function budgetLabel(category: BudgetCategory): string {
  return BUDGET_LABELS[category];
}
