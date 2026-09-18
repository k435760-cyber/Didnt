'use client';

import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { LineChart } from '@/components/charts/LineChart';
import { BUDGET_LABELS } from '@/config/fiscal';
import { BUDGET_CATEGORIES } from '@/types/fiscal';
import { RELATION_LABELS } from '@/config/diplomacy';
import { relationStatus, getRelation } from '@/simulation/diplomacy/relations';
import { COUNTRY_IDS } from '@/types/country';
import { formatMoney, formatPercent } from '@/lib/format';
import { useGameStore } from '@/store/gameStore';
import { Flag } from '@/components/Flag';

export function OverviewScreen() {
  const game = useGameStore((store) => store.game);
  if (!game) return null;

  const nation = game.nations[game.playerCountry];
  const history = game.history.slice(-32);
  const labels = history.map((p) => `${String(p.year).slice(2)}·${p.quarter}Q`);

  const topBudget = [...BUDGET_CATEGORIES]
    .sort((a, b) => nation.policy.budget[b] - nation.policy.budget[a])
    .slice(0, 5);

  const activeModifiers = nation.modifiers.slice(0, 6);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <Panel
        title="성장률과 잠재성장률"
        description="실제 성장률이 잠재성장률을 계속 웃돌면 물가가 오르고, 밑돌면 실업률이 오릅니다."
      >
        <LineChart
          labels={labels}
          includeZero
          format={(v) => `${v.toFixed(1)}%`}
          series={[
            { key: 'growth', label: '성장률', values: history.map((p) => p.gdpGrowth) },
            {
              key: 'potential',
              label: '잠재성장률',
              values: history.map((p) => p.potentialGrowth),
            },
          ]}
        />
      </Panel>

      <Panel title="국가 현황">
        <dl className="grid grid-cols-2 gap-x-5 gap-y-3 text-[12px]">
          <Row label="노동생산성" value={nation.economy.productivity.toFixed(1)} />
          <Row label="산업 경쟁력" value={`${nation.economy.competitiveness.toFixed(0)}/100`} />
          <Row label="교육 수준" value={`${nation.population.educationIndex.toFixed(0)}/100`} />
          <Row label="정치 안정성" value={`${nation.politics.stability.toFixed(0)}/100`} />
          <Row label="에너지 의존도" value={`${nation.economy.energyDependence.toFixed(0)}/100`} />
          <Row label="군사력 지수" value={nation.military.power.toFixed(0)} />
          <Row
            label="무역수지"
            value={formatMoney(nation.economy.exports - nation.economy.imports)}
          />
          <Row
            label="임기"
            value={`${Math.floor(nation.politics.quartersInOffice / 4)}년 ${nation.politics.quartersInOffice % 4}분기`}
          />
        </dl>

        <h3 className="mt-5 text-[11px] font-semibold text-[var(--color-ink-muted)]">
          지출 상위 항목 (GDP 대비)
        </h3>
        <div className="mt-2 flex flex-col gap-1.5">
          {topBudget.map((category) => {
            const value = nation.policy.budget[category];
            return (
              <div key={category} className="flex items-center gap-2 text-[11px]">
                <span className="w-14 shrink-0 text-[var(--color-ink-muted)]">
                  {BUDGET_LABELS[category]}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.min((value / 18) * 100, 100)}%`,
                      backgroundColor: 'var(--color-accent)',
                    }}
                  />
                </span>
                <span className="tnum w-10 text-right font-medium">{value.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="진행 중인 상황" description="이벤트와 정책으로 발생한 지속 효과입니다.">
        {activeModifiers.length === 0 ? (
          <p className="text-xs text-[var(--color-ink-faint)]">
            현재 국가에 걸려 있는 특별한 효과가 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activeModifiers.map((modifier, index) => (
              <li
                key={`${modifier.label}-${index}`}
                className="flex items-center justify-between gap-3 text-[12px]"
              >
                <span>{modifier.label}</span>
                <span className="flex items-center gap-2">
                  <span
                    className="tnum text-[11px] font-medium"
                    style={{
                      color:
                        modifier.value >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
                    }}
                  >
                    {modifier.value >= 0 ? '+' : ''}
                    {modifier.value}
                  </span>
                  <span className="text-[10px] text-[var(--color-ink-faint)]">
                    {modifier.turns}분기 남음
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="주요국 관계">
        <ul className="flex flex-col gap-1.5">
          {COUNTRY_IDS.filter((id) => id !== game.playerCountry).map((id) => {
            const value = getRelation(game.relations, game.playerCountry, id);
            const status = relationStatus(value);
            return (
              <li key={id} className="flex items-center gap-2.5 text-[12px]">
                <Flag country={id} size={18} />
                <span className="flex-1">{game.nations[id].name}</span>
                <Badge
                  tone={
                    status === 'allied' || status === 'friendly'
                      ? 'positive'
                      : status === 'hostile' || status === 'tense'
                        ? 'negative'
                        : 'neutral'
                  }
                >
                  {RELATION_LABELS[status]}
                </Badge>
                <span className="tnum w-10 text-right text-[11px] text-[var(--color-ink-muted)]">
                  {value.toFixed(0)}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--color-ink-faint)]">{label}</dt>
      <dd className="tnum font-medium">{value}</dd>
    </div>
  );
}

export { formatPercent };
