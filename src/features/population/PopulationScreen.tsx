'use client';

import { Panel } from '@/components/ui/Panel';
import { LineChart } from '@/components/charts/LineChart';
import { crudeBirthRate } from '@/simulation/population';
import { formatPercent, formatPopulation } from '@/lib/format';
import { useGameStore } from '@/store/gameStore';

export function PopulationScreen() {
  const game = useGameStore((store) => store.game);
  if (!game) return null;

  const nation = game.nations[game.playerCountry];
  const { population } = nation;
  const history = game.history.slice(-40);
  const labels = history.map((p) => `${String(p.year).slice(2)}·${p.quarter}Q`);

  const birthRate = crudeBirthRate(population.fertilityRate, population.workingAgeShare);
  const naturalChange = birthRate - population.mortalityRate;
  const workingAge = population.total * (population.workingAgeShare / 100);
  const elderly = population.total * (population.elderlyShare / 100);

  return (
    <div className="grid min-w-0 gap-3.5 md:gap-5 xl:grid-cols-2">
      <Panel
        title="총인구 추이"
        description="출생·사망·순이민의 합으로 분기마다 갱신됩니다."
        hideDescriptionOnMobile
      >
        <LineChart
          labels={labels}
          format={(v) => `${(v / 1_000_000).toFixed(0)}M`}
          series={[
            { key: 'population', label: '총인구', values: history.map((p) => p.population) },
          ]}
        />
      </Panel>

      <Panel title="인구 구조">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-[12px] md:gap-x-6">
          <Fact label="총인구" value={formatPopulation(population.total)} />
          <Fact label="합계출산율" value={population.fertilityRate.toFixed(2)} />
          <Fact label="조출생률" value={`${birthRate.toFixed(1)} / 1,000명`} />
          <Fact label="조사망률" value={`${population.mortalityRate.toFixed(1)} / 1,000명`} />
          <Fact
            label="자연증가율"
            value={`${naturalChange >= 0 ? '+' : ''}${naturalChange.toFixed(1)} / 1,000명`}
          />
          <Fact
            label="순이민율"
            value={`${population.migrationRate >= 0 ? '+' : ''}${population.migrationRate.toFixed(1)} / 1,000명`}
          />
          <Fact label="기대수명" value={`${population.lifeExpectancy.toFixed(1)}세`} />
          <Fact label="교육 수준" value={`${population.educationIndex.toFixed(1)}/100`} />
        </dl>

        <h3 className="mt-5 text-[11px] font-semibold text-[var(--color-ink-muted)]">인구 구조</h3>
        <div className="mt-2 flex h-6 overflow-hidden rounded-md">
          <Segment
            label="유소년"
            share={Math.max(100 - population.workingAgeShare - population.elderlyShare, 0)}
            color="var(--color-series-3)"
          />
          <Segment
            label="생산가능"
            share={population.workingAgeShare}
            color="var(--color-series-1)"
          />
          <Segment label="고령" share={population.elderlyShare} color="var(--color-series-2)" />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--color-ink-muted)] md:gap-x-4">
          <Legend
            color="var(--color-series-3)"
            label={`유소년 ${formatPercent(Math.max(100 - population.workingAgeShare - population.elderlyShare, 0))}`}
          />
          <Legend
            color="var(--color-series-1)"
            label={`생산가능 ${formatPercent(population.workingAgeShare)} (${formatPopulation(workingAge)})`}
          />
          <Legend
            color="var(--color-series-2)"
            label={`고령 ${formatPercent(population.elderlyShare)} (${formatPopulation(elderly)})`}
          />
        </div>
      </Panel>

      <Panel
        title="인구가 경제에 미치는 경로"
        description="인구는 GDP와 별개로 움직이지만, 노동력과 생산성을 통해 잠재성장률을 결정합니다."
        hideDescriptionOnMobile
        className="xl:col-span-2"
      >
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          <Path
            title="노동력"
            body={`생산가능인구 ${formatPopulation(workingAge)}. 이 규모의 증가율이 잠재성장률의 절반을 구성합니다. 현재 잠재성장률은 ${formatPercent(nation.economy.potentialGrowth)}입니다.`}
          />
          <Path
            title="고령화"
            body={`고령인구 비율 ${formatPercent(population.elderlyShare)}. 14%를 넘는 구간부터 생산성 목표치를 깎고, 의료·복지 지출을 함께 끌어올립니다.`}
          />
          <Path
            title="교육"
            body={`교육 수준 ${population.educationIndex.toFixed(1)}. 교육예산을 올리면 이 지수가 천천히 오르고, 그 결과로 생산성 목표와 구조적 실업률이 함께 개선됩니다.`}
          />
        </div>
      </Panel>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-[var(--color-ink-faint)]">{label}</dt>
      <dd className="tnum font-medium">{value}</dd>
    </div>
  );
}

function Segment({ label, share, color }: { label: string; share: number; color: string }) {
  return (
    <div
      title={`${label} ${share.toFixed(1)}%`}
      style={{ width: `${Math.max(share, 0)}%`, backgroundColor: color }}
    />
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function Path({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border bg-[var(--color-surface-muted)] px-3.5 py-3">
      <h4 className="text-[13px] font-semibold md:text-[12px]">{title}</h4>
      <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--color-ink-muted)] md:text-[11px]">
        {body}
      </p>
    </div>
  );
}
