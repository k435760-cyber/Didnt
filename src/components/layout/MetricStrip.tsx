'use client';

import { Stat, type Trend } from '@/components/ui/Stat';
import { Sparkline } from '@/components/charts/Sparkline';
import { formatCompactMoney, formatPercent, formatPopulation } from '@/lib/format';
import { useGameStore } from '@/store/gameStore';

function trendOf(delta: number, threshold = 0.05): Trend {
  if (delta > threshold) return 'up';
  if (delta < -threshold) return 'down';
  return 'flat';
}

/** 상단 핵심 지표 줄. 게임 시작 3초 안에 국가 상태를 읽을 수 있게 하는 게 목적이다. */
export function MetricStrip() {
  const history = useGameStore((store) => store.game?.history ?? []);
  const nation = useGameStore((store) =>
    store.game ? store.game.nations[store.game.playerCountry] : null,
  );

  if (!nation) return null;

  const recent = history.slice(-24);
  const previous = history[history.length - 2];
  const series = (pick: (point: (typeof history)[number]) => number) => recent.map(pick);

  const perCapita = (nation.economy.gdp * 1_000_000_000) / Math.max(nation.population.total, 1);

  return (
    <div className="grid grid-cols-2 divide-x divide-y border-b bg-[var(--color-surface)] sm:grid-cols-4 lg:grid-cols-7 lg:divide-y-0">
      <Stat
        label="GDP"
        value={formatCompactMoney(nation.economy.gdp)}
        sub={`1인당 ${Math.round(perCapita).toLocaleString('ko-KR')} USD`}
        chart={<Sparkline values={series((p) => p.gdp)} tone="accent" />}
      />
      <Stat
        label="성장률"
        value={formatPercent(nation.economy.gdpGrowth)}
        sub={`잠재 ${formatPercent(nation.economy.potentialGrowth)}`}
        delta={
          previous
            ? {
                value: `${Math.abs(nation.economy.gdpGrowth - previous.gdpGrowth).toFixed(1)}%p`,
                trend: trendOf(nation.economy.gdpGrowth - previous.gdpGrowth),
              }
            : undefined
        }
        chart={<Sparkline values={series((p) => p.gdpGrowth)} tone="accent" />}
      />
      <Stat
        label="인구"
        value={formatPopulation(nation.population.total)}
        sub={`출산율 ${nation.population.fertilityRate.toFixed(2)}`}
        chart={<Sparkline values={series((p) => p.population)} tone="neutral" />}
      />
      <Stat
        label="물가"
        value={formatPercent(nation.economy.inflation)}
        sub={`기준금리 ${nation.economy.policyRate.toFixed(2)}%`}
        invert
        delta={
          previous
            ? {
                value: `${Math.abs(nation.economy.inflation - previous.inflation).toFixed(1)}%p`,
                trend: trendOf(nation.economy.inflation - previous.inflation),
              }
            : undefined
        }
        chart={<Sparkline values={series((p) => p.inflation)} tone="neutral" />}
      />
      <Stat
        label="실업률"
        value={formatPercent(nation.economy.unemployment)}
        invert
        delta={
          previous
            ? {
                value: `${Math.abs(nation.economy.unemployment - previous.unemployment).toFixed(1)}%p`,
                trend: trendOf(nation.economy.unemployment - previous.unemployment),
              }
            : undefined
        }
        chart={<Sparkline values={series((p) => p.unemployment)} tone="neutral" />}
      />
      <Stat
        label="국가부채"
        value={`${nation.fiscal.debtToGdp.toFixed(0)}%`}
        sub={`조달금리 ${nation.fiscal.interestRate.toFixed(2)}%`}
        invert
        delta={
          previous
            ? {
                value: `${Math.abs(nation.fiscal.debtToGdp - previous.debtToGdp).toFixed(1)}%p`,
                trend: trendOf(nation.fiscal.debtToGdp - previous.debtToGdp),
              }
            : undefined
        }
        chart={<Sparkline values={series((p) => p.debtToGdp)} tone="neutral" />}
      />
      <Stat
        label="지지율"
        value={formatPercent(nation.politics.approval, 0)}
        sub={`안정성 ${nation.politics.stability.toFixed(0)}`}
        delta={
          previous
            ? {
                value: `${Math.abs(nation.politics.approval - previous.approval).toFixed(1)}%p`,
                trend: trendOf(nation.politics.approval - previous.approval),
              }
            : undefined
        }
        chart={<Sparkline values={series((p) => p.approval)} tone="accent" />}
      />
    </div>
  );
}
