import type { BudgetAllocation, Personality } from '@/types';

/** 성향별 예산 배분 선호도. 합이 1 이 되도록 정규화되어 있다. */
export const BUDGET_PREFERENCE: Record<Personality, BudgetAllocation> = {
  aggressive: {
    welfare: 0.18,
    education: 0.1,
    defense: 0.18,
    healthcare: 0.16,
    security: 0.1,
    infrastructure: 0.1,
    research: 0.08,
    environment: 0.03,
    industry: 0.07,
  },
  neutral: {
    welfare: 0.24,
    education: 0.12,
    defense: 0.08,
    healthcare: 0.2,
    security: 0.07,
    infrastructure: 0.1,
    research: 0.07,
    environment: 0.05,
    industry: 0.07,
  },
  economic: {
    welfare: 0.2,
    education: 0.13,
    defense: 0.07,
    healthcare: 0.17,
    security: 0.06,
    infrastructure: 0.13,
    research: 0.11,
    environment: 0.05,
    industry: 0.08,
  },
  diplomatic: {
    welfare: 0.28,
    education: 0.14,
    defense: 0.06,
    healthcare: 0.21,
    security: 0.06,
    infrastructure: 0.09,
    research: 0.07,
    environment: 0.06,
    industry: 0.03,
  },
  isolationist: {
    welfare: 0.24,
    education: 0.1,
    defense: 0.13,
    healthcare: 0.19,
    security: 0.11,
    infrastructure: 0.1,
    research: 0.06,
    environment: 0.03,
    industry: 0.04,
  },
};

/** 성향별 세율 선호. 목표 세율로 서서히 이동한다. */
export const TAX_PREFERENCE: Record<
  Personality,
  { income: number; corporate: number; consumption: number }
> = {
  aggressive: { income: 26, corporate: 24, consumption: 12 },
  neutral: { income: 25, corporate: 23, consumption: 12 },
  economic: { income: 22, corporate: 18, consumption: 13 },
  diplomatic: { income: 31, corporate: 26, consumption: 16 },
  isolationist: { income: 28, corporate: 27, consumption: 14 },
};

/** 성향별 전쟁 개시 성향. 값이 클수록 공격적이다. */
export const WAR_APPETITE: Record<Personality, number> = {
  aggressive: 1,
  neutral: 0.25,
  economic: 0.12,
  diplomatic: 0.05,
  isolationist: 0.3,
};
