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

/**
 * 핵심 지표 줄.
 *
 * md 이상에서만 보인다. 모바일에서는 개요 화면의 '핵심 지표' 격자가 같은 역할을 하며,
 * 화면마다 같은 줄을 반복해 세로 공간을 잡아먹지 않도록 했다.
 */
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
  const delta = (current: number, before: number | undefined, digits = 1) =>
    before === undefined
      ? undefined
      : {
          value: `${Math.abs(current - before).toFixed(digits)}%p`,
          trend: trendOf(current - before),
        };

  return (
    <div className="hidden divide-x divide-y border-b bg-[var(--color-surface)] md:grid md:grid-cols-4 lg:grid-cols-7 lg:divide-y-0">
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
        delta={delta(nation.economy.gdpGrowth, previous?.gdpGrowth)}
        chart={<Sparkline values={series((p) => p.gdpGrowth)} tone="accent" />}
      />
      <Stat
        label="물가"
        value={formatPercent(nation.economy.inflation)}
        sub={`기준금리 ${nation.economy.policyRate.toFixed(2)}%`}
        invert
        delta={delta(nation.economy.inflation, previous?.inflation)}
        chart={<Sparkline values={series((p) => p.inflation)} tone="neutral" />}
      />
      <Stat
        label="실업률"
        value={formatPercent(nation.economy.unemployment)}
        invert
        delta={delta(nation.economy.unemployment, previous?.unemployment)}
        chart={<Sparkline values={series((p) => p.unemployment)} tone="neutral" />}
      />
      <Stat
        label="국가부채"
        value={`${nation.fiscal.debtToGdp.toFixed(0)}%`}
        sub={`조달금리 ${nation.fiscal.interestRate.toFixed(2)}%`}
        invert
        delta={delta(nation.fiscal.debtToGdp, previous?.debtToGdp)}
        chart={<Sparkline values={series((p) => p.debtToGdp)} tone="neutral" />}
      />
      <Stat
        label="지지율"
        value={formatPercent(nation.politics.approval, 0)}
        sub={`안정성 ${nation.politics.stability.toFixed(0)}`}
        delta={delta(nation.politics.approval, previous?.approval)}
        chart={<Sparkline values={series((p) => p.approval)} tone="accent" />}
      />
      <div>
        <Stat
          label="인구"
          value={formatPopulation(nation.population.total)}
          sub={`출산율 ${nation.population.fertilityRate.toFixed(2)}`}
          chart={<Sparkline values={series((p) => p.population)} tone="neutral" />}
        />
      </div>
    </div>
  );
}
