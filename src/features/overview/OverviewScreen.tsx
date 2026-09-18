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
    <div className="grid min-w-0 gap-3.5 md:gap-5 xl:grid-cols-[1.4fr_1fr]">
      {/*
        모바일에서는 밀도가 높은 '국가 현황'을 먼저 보여준다.
        데스크톱에서는 기존 2열 배치(차트 좌 / 현황 우)를 그대로 유지한다.
      */}
      <Panel title="국가 현황" className="order-1 xl:order-2">
        <dl className="grid grid-cols-3 gap-x-3 gap-y-3 md:grid-cols-2 md:gap-x-5">
          <Row
            label="생산성"
            fullLabel="노동생산성"
            value={nation.economy.productivity.toFixed(1)}
          />
          <Row
            label="경쟁력"
            fullLabel="산업 경쟁력"
            value={`${nation.economy.competitiveness.toFixed(0)}`}
            unit="/100"
          />
          <Row
            label="교육"
            fullLabel="교육 수준"
            value={`${nation.population.educationIndex.toFixed(0)}`}
            unit="/100"
          />
          <Row
            label="안정성"
            fullLabel="정치 안정성"
            value={`${nation.politics.stability.toFixed(0)}`}
            unit="/100"
          />
          <Row
            label="에너지"
            fullLabel="에너지 의존도"
            value={`${nation.economy.energyDependence.toFixed(0)}`}
            unit="/100"
          />
          <Row label="군사력" fullLabel="군사력 지수" value={nation.military.power.toFixed(0)} />
          <div className="hidden md:block">
            <dt className="text-[11px] text-[var(--color-ink-faint)]">무역수지</dt>
            <dd className="tnum text-[13px] font-medium">
              {formatMoney(nation.economy.exports - nation.economy.imports)}
            </dd>
          </div>
          <div className="hidden md:block">
            <dt className="text-[11px] text-[var(--color-ink-faint)]">임기</dt>
            <dd className="tnum text-[13px] font-medium">
              {Math.floor(nation.politics.quartersInOffice / 4)}년{' '}
              {nation.politics.quartersInOffice % 4}분기
            </dd>
          </div>
        </dl>

        <h3 className="mt-4 text-[12px] font-semibold text-[var(--color-ink-muted)] md:mt-5 md:text-[11px]">
          지출 상위 항목 (GDP 대비)
        </h3>
        <div className="mt-2 flex flex-col gap-2 md:gap-1.5">
          {topBudget.map((category) => {
            const value = nation.policy.budget[category];
            return (
              <div key={category} className="flex items-center gap-2 text-[12px] md:text-[11px]">
                <span className="w-11 shrink-0 truncate text-[var(--color-ink-muted)] md:w-14">
                  {BUDGET_LABELS[category]}
                </span>
                <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.min((value / 18) * 100, 100)}%`,
                      backgroundColor: 'var(--color-accent)',
                    }}
                  />
                </span>
                <span className="tnum w-10 shrink-0 text-right font-medium">
                  {value.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="성장률과 잠재성장률"
        description="실제 성장률이 잠재성장률을 계속 웃돌면 물가가 오르고, 밑돌면 실업률이 오릅니다."
        hideDescriptionOnMobile
        className="order-2 xl:order-1"
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

      <Panel title="주요국 관계" className="order-3 xl:order-4">
        {/* 모바일에서는 한 국가가 한 줄을 다 쓰지 않도록 2열로 묶는다. */}
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 xl:grid-cols-1 xl:gap-y-1.5">
          {COUNTRY_IDS.filter((id) => id !== game.playerCountry).map((id) => {
            const value = getRelation(game.relations, game.playerCountry, id);
            const status = relationStatus(value);
            const tone =
              status === 'allied' || status === 'friendly'
                ? 'positive'
                : status === 'hostile' || status === 'tense'
                  ? 'negative'
                  : 'neutral';

            return (
              <li key={id} className="flex min-w-0 items-center gap-2 text-[12px] xl:gap-2.5">
                <Flag country={id} size={18} />
                <span className="min-w-0 flex-1 truncate">{game.nations[id].name}</span>
                <span className="hidden xl:block">
                  <Badge tone={tone}>{RELATION_LABELS[status]}</Badge>
                </span>
                <span
                  className="tnum shrink-0 text-right text-[12px] font-medium"
                  style={{
                    color:
                      tone === 'positive'
                        ? 'var(--color-positive)'
                        : tone === 'negative'
                          ? 'var(--color-negative)'
                          : 'var(--color-ink-muted)',
                  }}
                >
                  {value >= 0 ? '+' : ''}
                  {value.toFixed(0)}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel
        title="진행 중인 상황"
        description="이벤트와 정책으로 발생한 지속 효과입니다."
        hideDescriptionOnMobile
        className="order-4 xl:order-3"
      >
        {activeModifiers.length === 0 ? (
          <p className="text-[12px] text-[var(--color-ink-faint)]">
            현재 국가에 걸려 있는 특별한 효과가 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activeModifiers.map((modifier, index) => (
              <li
                key={`${modifier.label}-${index}`}
                className="flex items-center justify-between gap-3 text-[12px]"
              >
                <span className="min-w-0 truncate">{modifier.label}</span>
                <span className="flex shrink-0 items-center gap-2">
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
                  <span className="whitespace-nowrap text-[11px] text-[var(--color-ink-faint)]">
                    {modifier.turns}분기
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/** 좁은 화면에서는 짧은 라벨, md 이상에서는 원래의 전체 라벨을 쓴다. */
function Row({
  label,
  fullLabel,
  value,
  unit,
}: {
  label: string;
  fullLabel: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] text-[var(--color-ink-faint)]">
        <span className="md:hidden">{label}</span>
        <span className="hidden md:inline">{fullLabel}</span>
      </dt>
      <dd className="tnum text-[15px] font-semibold md:text-[13px] md:font-medium">
        {value}
        {unit && (
          <span className="text-[11px] font-normal text-[var(--color-ink-faint)]">{unit}</span>
        )}
      </dd>
    </div>
  );
}

export { formatPercent };
