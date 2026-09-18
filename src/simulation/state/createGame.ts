import type {
  CountryId,
  GameState,
  HistoryPoint,
  NationState,
  PolicyState,
  RelationMatrix,
  Treaty,
} from '@/types';
import { COUNTRY_IDS } from '@/types/country';
import { COUNTRIES, type InitialCountryData } from '@/config/countries';
import { GAME_START_YEAR } from '@/config/constants';
import { INITIAL_RELATIONS, INITIAL_TREATIES } from '@/config/diplomacy';
import { SAVE_VERSION } from '@/types/save';
import { generateSeed } from '../rng';
import { computeTrade } from '../economy/trade';
import { directPurchaseRatio } from '../economy/spending';
import { computeRevenue } from '../economy/tax';
import { computeExpenditure } from '../economy/spending';
import { computeInterestRate, debtToGdpRatio } from '../economy/debt';
import { computePower } from '../military/power';
import { computePropensities, splitDemand } from '../economy/gdp';
import { baselineRelation, relationKey, withRelation } from '../diplomacy/relations';
import { calibrate } from './calibration';

function clonePolicy(policy: PolicyState): PolicyState {
  return {
    tax: { ...policy.tax },
    budget: { ...policy.budget },
    policyRate: policy.policyRate,
    centralBankAuto: policy.centralBankAuto,
  };
}

function createNation(data: InitialCountryData): NationState {
  const calibration = calibrate(data);
  const policy: PolicyState = {
    tax: { ...data.tax },
    budget: { ...data.budget },
    policyRate: data.policyRate,
    centralBankAuto: true,
  };

  const governmentSpending = data.gdp * (directPurchaseRatio(data.budget) / 100);
  const trade = computeTrade(data.gdp, data.exportShare, data.importShare);
  const propensities = computePropensities(
    {
      tax: data.tax,
      budget: data.budget,
      unemployment: data.unemployment,
      structuralUnemployment: data.unemployment,
      policyRate: data.policyRate,
      inflation: data.inflation,
      stability: data.stability,
    },
    {
      consumption: calibration.propensityConsumption,
      investment: calibration.propensityInvestment,
    },
  );
  const demand = splitDemand(data.gdp, governmentSpending, trade.balance, propensities);

  const debt = (data.debtToGdp / 100) * data.gdp;
  const interestRate = computeInterestRate({
    policyRate: data.policyRate,
    debtToGdp: data.debtToGdp,
    stability: data.stability,
  });
  const revenue = computeRevenue({
    gdp: data.gdp,
    consumption: demand.consumption,
    tax: data.tax,
    revenueCalibration: calibration.revenue,
    modifierRevenue: 0,
  });
  const expenditure = computeExpenditure({
    gdp: data.gdp,
    budget: data.budget,
    unemployment: data.unemployment,
    debt,
    interestRate,
    modifierSpending: 0,
  });

  return {
    id: data.id,
    name: data.name,
    personality: data.personality,
    economy: {
      gdp: data.gdp,
      gdpGrowth: data.trendGrowth,
      potentialGrowth: data.trendGrowth,
      consumption: demand.consumption,
      investment: demand.investment,
      governmentSpending,
      exports: trade.exports,
      imports: trade.imports,
      inflation: data.inflation,
      unemployment: data.unemployment,
      policyRate: data.policyRate,
      productivity: data.productivity,
      competitiveness: data.competitiveness,
      energyDependence: data.energyDependence,
      priceIndex: 100,
    },
    fiscal: {
      revenue: revenue.total,
      expenditure: expenditure.total,
      balance: revenue.total - expenditure.total,
      debt,
      debtToGdp: data.debtToGdp,
      interestRate,
    },
    population: {
      total: data.population,
      fertilityRate: data.fertilityRate,
      mortalityRate: data.mortalityRate,
      lifeExpectancy: data.lifeExpectancy,
      workingAgeShare: data.workingAgeShare,
      elderlyShare: data.elderlyShare,
      migrationRate: data.migrationRate,
      educationIndex: data.educationIndex,
    },
    politics: {
      approval: data.approval,
      stability: data.stability,
      quartersInOffice: 0,
    },
    military: {
      troops: data.troops,
      techLevel: data.militaryTech,
      readiness: data.militaryReadiness,
      warExhaustion: 0,
      power: computePower({
        troops: data.troops,
        techLevel: data.militaryTech,
        readiness: data.militaryReadiness,
        defenseBudget: data.gdp * (data.budget.defense / 100),
      }),
    },
    policy,
    lastAppliedPolicy: clonePolicy(policy),
    modifiers: [],
    calibration,
  };
}

function createRelations(): RelationMatrix {
  let matrix: RelationMatrix = {};

  for (let i = 0; i < COUNTRY_IDS.length; i += 1) {
    for (let j = i + 1; j < COUNTRY_IDS.length; j += 1) {
      const a = COUNTRY_IDS[i];
      const b = COUNTRY_IDS[j];
      if (!a || !b) continue;

      const key = relationKey(a, b);
      const preset = INITIAL_RELATIONS[key];
      const value = preset ?? baselineRelation(COUNTRIES[a], COUNTRIES[b]);
      matrix = withRelation(matrix, a, b, value);
    }
  }

  return matrix;
}

function createTreaties(): Treaty[] {
  return INITIAL_TREATIES.map((treaty) => ({
    kind: treaty.kind,
    a: treaty.a as CountryId,
    b: treaty.b as CountryId,
    since: 0,
  }));
}

export function historyPointFrom(
  nation: NationState,
  turn: number,
  startYear: number,
): HistoryPoint {
  return {
    turn,
    year: startYear + Math.floor(turn / 4),
    quarter: (turn % 4) + 1,
    gdp: nation.economy.gdp,
    gdpGrowth: nation.economy.gdpGrowth,
    potentialGrowth: nation.economy.potentialGrowth,
    gdpPerCapita: (nation.economy.gdp * 1_000_000_000) / Math.max(nation.population.total, 1),
    inflation: nation.economy.inflation,
    unemployment: nation.economy.unemployment,
    debtToGdp: nation.fiscal.debtToGdp,
    approval: nation.politics.approval,
    population: nation.population.total,
    balance: nation.fiscal.balance,
  };
}

export interface CreateGameOptions {
  playerCountry: CountryId;
  seed?: string;
  startYear?: number;
}

export function createGame(options: CreateGameOptions): GameState {
  const seed = options.seed?.trim() || generateSeed();
  const startYear = options.startYear ?? GAME_START_YEAR;

  const nations = {} as Record<CountryId, NationState>;
  for (const id of COUNTRY_IDS) {
    nations[id] = createNation(COUNTRIES[id]);
  }

  const player = nations[options.playerCountry];

  return {
    version: SAVE_VERSION,
    seed,
    turn: 0,
    startYear,
    playerCountry: options.playerCountry,
    nations,
    relations: createRelations(),
    treaties: createTreaties(),
    sanctions: [],
    wars: [],
    activeEvents: [],
    eventHistory: [],
    pendingEvent: null,
    news: [
      {
        id: '0-0',
        turn: 0,
        headline: `${player.name} 신임 내각 출범`,
        body: `임기 첫 분기 예산과 세율을 확정해야 합니다. 현재 지지율은 ${Math.round(player.politics.approval)}%, 국가부채는 GDP 대비 ${Math.round(player.fiscal.debtToGdp)}% 입니다.`,
        tone: 'neutral',
        section: 'politics',
      },
    ],
    history: [historyPointFrom(player, 0, startYear)],
    gameOver: null,
  };
}

export { debtToGdpRatio };
