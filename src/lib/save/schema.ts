import { z } from 'zod';
import { COUNTRY_IDS } from '@/types/country';
import { BUDGET_CATEGORIES } from '@/types/fiscal';
import { SAVE_VERSION, type SaveFile } from '@/types/save';
import type { GameState } from '@/types';

/**
 * 저장 데이터 검증 스키마.
 *
 * localStorage 는 사용자가 직접 수정할 수 있으므로 신뢰하지 않는다.
 * 모든 수치는 유한값이어야 하고, 비율은 허용 범위 안에 있어야 한다.
 */
const finite = z.number().refine(Number.isFinite, { message: '유한한 숫자가 아닙니다.' });
const percent = finite.min(-1000).max(10000);
const nonNegative = finite.min(0);

const countryId = z.enum(COUNTRY_IDS);

const economySchema = z.object({
  gdp: finite.positive(),
  gdpGrowth: percent,
  potentialGrowth: percent,
  consumption: nonNegative,
  investment: nonNegative,
  governmentSpending: nonNegative,
  exports: nonNegative,
  imports: nonNegative,
  inflation: percent,
  unemployment: finite.min(0).max(100),
  policyRate: finite.min(0).max(100),
  productivity: finite.positive(),
  competitiveness: finite.min(0).max(100),
  energyDependence: finite.min(0).max(100),
  priceIndex: finite.positive(),
});

const fiscalSchema = z.object({
  revenue: finite,
  expenditure: finite,
  balance: finite,
  debt: nonNegative,
  debtToGdp: nonNegative,
  interestRate: finite.min(0).max(100),
});

const populationSchema = z.object({
  total: finite.positive(),
  fertilityRate: finite.min(0).max(10),
  mortalityRate: finite.min(0).max(100),
  lifeExpectancy: finite.min(20).max(120),
  workingAgeShare: finite.min(0).max(100),
  elderlyShare: finite.min(0).max(100),
  migrationRate: finite.min(-100).max(100),
  educationIndex: finite.min(0).max(100),
});

const politicsSchema = z.object({
  approval: finite.min(0).max(100),
  stability: finite.min(0).max(100),
  quartersInOffice: finite.min(0),
});

const militarySchema = z.object({
  power: finite.min(0),
  troops: finite.min(0),
  techLevel: finite.min(0).max(100),
  readiness: finite.min(0).max(100),
  warExhaustion: finite.min(0).max(100),
});

const budgetSchema = z.object(
  Object.fromEntries(BUDGET_CATEGORIES.map((c) => [c, finite.min(0).max(100)])) as Record<
    (typeof BUDGET_CATEGORIES)[number],
    typeof finite
  >,
);

const policySchema = z.object({
  tax: z.object({
    income: finite.min(0).max(100),
    corporate: finite.min(0).max(100),
    consumption: finite.min(0).max(100),
  }),
  budget: budgetSchema,
  policyRate: finite.min(0).max(100),
  centralBankAuto: z.boolean(),
});

const modifierSchema = z.object({
  field: z.string(),
  value: finite,
  turns: finite.min(0),
  label: z.string(),
});

const calibrationSchema = z.object({
  productivity: finite,
  competitiveness: finite,
  growth: finite,
  inflation: finite,
  unemployment: finite,
  fertility: finite,
  mortality: finite,
  lifeExpectancy: finite,
  migration: finite,
  education: finite,
  exportShare: finite,
  importShare: finite,
  revenue: finite,
  taylor: finite,
  approval: finite,
  stability: finite,
  propensityConsumption: finite,
  propensityInvestment: finite,
  militaryTech: finite,
  troops: finite,
});

const nationSchema = z.object({
  id: countryId,
  name: z.string().min(1).max(40),
  personality: z.enum(['aggressive', 'neutral', 'economic', 'diplomatic', 'isolationist']),
  economy: economySchema,
  fiscal: fiscalSchema,
  population: populationSchema,
  politics: politicsSchema,
  military: militarySchema,
  policy: policySchema,
  lastAppliedPolicy: policySchema,
  modifiers: z.array(modifierSchema).max(200),
  calibration: calibrationSchema,
});

const historyPointSchema = z.object({
  turn: finite.min(0),
  year: finite,
  quarter: finite.min(1).max(4),
  gdp: finite,
  gdpGrowth: finite,
  potentialGrowth: finite,
  gdpPerCapita: finite,
  inflation: finite,
  unemployment: finite,
  debtToGdp: finite,
  approval: finite,
  population: finite,
  balance: finite,
});

const newsSchema = z.object({
  id: z.string().max(64),
  turn: finite.min(0),
  headline: z.string().max(200),
  body: z.string().max(600),
  tone: z.enum(['good', 'bad', 'neutral']),
  section: z.enum(['economy', 'society', 'politics', 'world', 'defense']),
});

export const gameStateSchema = z.object({
  version: z.number().int().min(1),
  seed: z.string().min(1).max(64),
  turn: z.number().int().min(0).max(4000),
  startYear: z.number().int().min(1900).max(3000),
  playerCountry: countryId,
  nations: z.object(
    Object.fromEntries(COUNTRY_IDS.map((id) => [id, nationSchema])) as Record<
      (typeof COUNTRY_IDS)[number],
      typeof nationSchema
    >,
  ),
  relations: z.record(z.string(), finite.min(-100).max(100)),
  treaties: z.array(
    z.object({ kind: z.enum(['trade', 'alliance']), a: countryId, b: countryId, since: finite }),
  ),
  sanctions: z.array(z.object({ by: countryId, on: countryId, since: finite })),
  wars: z.array(
    z.object({
      attacker: countryId,
      defender: countryId,
      startedTurn: finite,
      frontline: finite,
      cost: finite,
    }),
  ),
  activeEvents: z.array(
    z.object({
      eventId: z.string().max(64),
      title: z.string().max(120),
      category: z.enum(['economy', 'society', 'disaster', 'international', 'technology']),
      startedTurn: finite,
      choiceId: z.string().max(64).nullable(),
      remainingTurns: finite,
    }),
  ),
  eventHistory: z.array(
    z.object({
      turn: finite,
      eventId: z.string().max(64),
      title: z.string().max(120),
      choiceId: z.string().max(64).nullable(),
      choiceLabel: z.string().max(120).nullable(),
    }),
  ),
  pendingEvent: z.object({ eventId: z.string().max(64), turn: finite }).nullable(),
  news: z.array(newsSchema).max(400),
  history: z.array(historyPointSchema).max(2000),
  gameOver: z.object({ reason: z.string().max(300), turn: finite }).nullable(),
});

export const saveFileSchema = z.object({
  version: z.number().int().min(1).max(SAVE_VERSION),
  savedAt: z.string().min(1).max(64),
  label: z.string().max(80),
  state: gameStateSchema,
});

export type ParseResult = { ok: true; save: SaveFile } | { ok: false; error: string };

/** 문자열을 파싱해 검증까지 수행한다. 실패 사유를 사람이 읽을 수 있게 돌려준다. */
export function parseSave(raw: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: '저장 데이터를 읽을 수 없습니다. 형식이 올바르지 않습니다.' };
  }

  const parsed = saveFileSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path.join('.') ?? '';
    return { ok: false, error: `저장 데이터 검증 실패${path ? ` (${path})` : ''}` };
  }

  if (parsed.data.version !== SAVE_VERSION) {
    return { ok: false, error: `지원하지 않는 저장 버전입니다 (v${parsed.data.version}).` };
  }

  return { ok: true, save: parsed.data as SaveFile };
}

export function serializeSave(state: GameState, label: string): string {
  const payload: SaveFile = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    label,
    state,
  };
  return JSON.stringify(payload);
}
