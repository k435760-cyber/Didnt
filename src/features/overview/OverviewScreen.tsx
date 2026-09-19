'use client';

import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Flag } from '@/components/Flag';
import { LineChart } from '@/components/charts/LineChart';
import { BUDGET_LABELS } from '@/config/fiscal';
import { BUDGET_CATEGORIES } from '@/types/fiscal';
import { RELATION_LABELS } from '@/config/diplomacy';
import { COUNTRY_IDS } from '@/types/country';
import { getRelation, relationStatus } from '@/simulation/diplomacy/relations';
import {
  TONE_COLOR,
  assessCompetitiveness,
  assessDebt,
  assessEducation,
  assessEnergy,
  assessGrowth,
  assessInflation,
  assessMilitaryRank,
  assessProductivity,
  assessStability,
  assessUnemployment,
  balanceRatio,
  buildBriefing,
  buildConcerns,
  militaryRank,
  type Assessment,
} from '@/lib/assessment';
import { formatCompactMoney, formatMoney, formatPercent, formatPopulation } from '@/lib/format';
import { useGameStore } from '@/store/gameStore';
import { CountryHeader } from './CountryHeader';

export function OverviewScreen() {
  const game = useGameStore((store) => store.game);
  if (!game) return null;

  const nation = game.nations[game.playerCountry];
  const history = game.history.slice(-32);
  const labels = history.map((p) => `${String(p.year).slice(2)}·${p.quarter}Q`);

  const previous = game.history[game.history.length - 2];
  const trend = {
    debtToGdp: previous ? nation.fiscal.debtToGdp - previous.debtToGdp : 0,
    approval: previous ? nation.politics.approval - previous.approval : 0,
    unemployment: previous ? nation.economy.unemployment - previous.unemployment : 0,
  };

  const briefing = buildBriefing(game);
  const concerns = buildConcerns({ state: game, trend });
  const recentNews = [...game.news].reverse().slice(0, 3);

  const topBudget = [...BUDGET_CATEGORIES]
    .sort((a, b) => nation.policy.budget[b] - nation.policy.budget[a])
    .slice(0, 5);

  const rank = militaryRank(game);

  return (
    <div className="flex min-w-0 flex-col gap-3.5 md:gap-5 xl:grid xl:grid-cols-[1.4fr_1fr] xl:items-start">
      <div className="flex min-w-0 flex-col gap-3.5 md:gap-5 xl:contents">
        <div className="xl:col-span-2">
          <CountryHeader state={game} />
        </div>

        {/* 핵심 지표 — 카드를 겹치지 않고 격자만으로 구획한다. */}
        <section
          className="grid min-w-0 grid-cols-2 divide-x divide-y overflow-hidden rounded-lg border bg-[var(--color-surface)] sm:grid-cols-3 xl:col-span-2 xl:grid-cols-5 xl:divide-y-0"
          style={{ borderColor: 'var(--color-line)' }}
        >
          <KeyMetric
            label="GDP"
            value={formatCompactMoney(nation.economy.gdp)}
            note={`1인당 ${Math.round((nation.economy.gdp * 1_000_000_000) / Math.max(nation.population.total, 1)).toLocaleString('ko-KR')} USD`}
          />
          <KeyMetric
            label="성장률"
            value={formatPercent(nation.economy.gdpGrowth)}
            state={assessGrowth(nation.economy.gdpGrowth)}
            note={`잠재 ${formatPercent(nation.economy.potentialGrowth)}`}
          />
          <KeyMetric
            label="물가"
            value={formatPercent(nation.economy.inflation)}
            state={assessInflation(nation.economy.inflation)}
          />
          <KeyMetric
            label="실업률"
            value={formatPercent(nation.economy.unemployment)}
            state={assessUnemployment(nation.economy.unemployment)}
          />
          <KeyMetric
            label="국가부채"
            value={`${nation.fiscal.debtToGdp.toFixed(0)}%`}
            state={assessDebt(nation.fiscal.debtToGdp)}
            note={`재정수지 ${balanceRatio(nation).toFixed(1)}%`}
            className="col-span-2 sm:col-span-1"
          />
        </section>

        <Panel title="국정 브리핑" className="xl:order-1">
          <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3 md:grid-cols-5">
            {briefing.map((item) => (
              <li key={item.key} className="min-w-0">
                <p className="text-[11px] text-[var(--color-ink-faint)]">{item.label}</p>
                <p
                  className="truncate text-[15px] font-semibold md:text-[14px]"
                  style={{ color: TONE_COLOR[item.state.tone] }}
                >
                  {item.state.label}
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        {concerns.length > 0 && (
          <Panel title="주요 현안" className="xl:order-3">
            <ul className="flex flex-col gap-2.5">
              {concerns.map((concern) => (
                <li
                  key={concern.key}
                  className="border-l-2 pl-3"
                  style={{
                    borderColor:
                      concern.tone === 'risk' ? 'var(--color-negative)' : 'var(--color-caution)',
                  }}
                >
                  <p
                    className="text-[13px] font-semibold"
                    style={{
                      color:
                        concern.tone === 'risk' ? 'var(--color-negative)' : 'var(--color-caution)',
                    }}
                  >
                    {concern.title}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                    {concern.detail}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel
          title="성장률 추이"
          description="실제 성장률이 잠재성장률을 계속 웃돌면 물가가 오르고, 밑돌면 실업률이 오릅니다."
          hideDescriptionOnMobile
          className="xl:order-2 xl:row-span-2"
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

        <Panel title="최근 소식" className="xl:order-5">
          <ul className="flex flex-col gap-2.5">
            {recentNews.map((item) => (
              <li key={`${item.turn}-${item.id}`} className="flex gap-2.5">
                <span
                  className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      item.tone === 'good'
                        ? 'var(--color-positive)'
                        : item.tone === 'bad'
                          ? 'var(--color-negative)'
                          : 'var(--color-line-strong)',
                  }}
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium leading-snug">
                    {item.headline}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                    {item.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="국제 정세" className="xl:order-4">
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 xl:grid-cols-1">
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

        {/* 부차 정보 — 카드 없이 제목과 구분선만으로 묶는다. */}
        <Panel variant="plain" title="국력 상세" className="xl:order-6 xl:col-span-2">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-6">
            <DetailMetric
              label="노동생산성"
              value={nation.economy.productivity.toFixed(1)}
              state={assessProductivity(nation.economy.productivity)}
            />
            <DetailMetric
              label="산업 경쟁력"
              value={nation.economy.competitiveness.toFixed(0)}
              state={assessCompetitiveness(nation.economy.competitiveness)}
            />
            <DetailMetric
              label="교육 수준"
              value={nation.population.educationIndex.toFixed(0)}
              state={assessEducation(nation.population.educationIndex)}
            />
            <DetailMetric
              label="정치 안정성"
              value={nation.politics.stability.toFixed(0)}
              state={assessStability(nation.politics.stability)}
            />
            <DetailMetric
              label="에너지 의존도"
              value={nation.economy.energyDependence.toFixed(0)}
              state={assessEnergy(nation.economy.energyDependence)}
            />
            <DetailMetric
              label="군사력"
              value={nation.military.power.toFixed(0)}
              state={assessMilitaryRank(rank)}
              suffix={`${rank}위`}
            />
          </dl>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-[12px] font-semibold text-[var(--color-ink-muted)]">
                지출 상위 항목 (GDP 대비)
              </h3>
              <div className="mt-2 flex flex-col gap-2 md:gap-1.5">
                {topBudget.map((category) => {
                  const value = nation.policy.budget[category];
                  return (
                    <div
                      key={category}
                      className="flex items-center gap-2 text-[12px] md:text-[11px]"
                    >
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
            </div>

            <div>
              <h3 className="text-[12px] font-semibold text-[var(--color-ink-muted)]">국가 기본</h3>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                <Basic label="인구" value={formatPopulation(nation.population.total)} />
                <Basic label="합계출산율" value={nation.population.fertilityRate.toFixed(2)} />
                <Basic
                  label="무역수지"
                  value={formatMoney(nation.economy.exports - nation.economy.imports)}
                />
                <Basic label="기준금리" value={`${nation.economy.policyRate.toFixed(2)}%`} />
              </dl>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function KeyMetric({
  label,
  value,
  state,
  note,
  className,
}: {
  label: string;
  value: string;
  state?: Assessment;
  note?: string;
  className?: string;
}) {
  return (
    <div className={`min-w-0 px-3.5 py-2.5 md:px-4 md:py-3 ${className ?? ''}`}>
      <p className="truncate text-[11px] text-[var(--color-ink-faint)]">{label}</p>
      <p className="tnum mt-0.5 truncate text-[20px] font-semibold tracking-tight">{value}</p>
      {state && (
        <p className="truncate text-[11px] font-medium" style={{ color: TONE_COLOR[state.tone] }}>
          {state.label}
        </p>
      )}
      {note && !state && (
        <p className="truncate text-[11px] text-[var(--color-ink-faint)]">{note}</p>
      )}
    </div>
  );
}

/** 숫자와 함께 그 숫자가 어떤 상태인지 한 단어로 붙인다. */
function DetailMetric({
  label,
  value,
  state,
  suffix,
}: {
  label: string;
  value: string;
  state: Assessment;
  suffix?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] text-[var(--color-ink-faint)]">{label}</dt>
      <dd className="tnum truncate text-[15px] font-semibold md:text-[14px]">
        {value}
        <span className="ml-1.5 text-[11px] font-medium" style={{ color: TONE_COLOR[state.tone] }}>
          · {suffix ?? state.label}
        </span>
      </dd>
    </div>
  );
}

function Basic({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] text-[var(--color-ink-faint)]">{label}</dt>
      <dd className="tnum truncate font-medium">{value}</dd>
    </div>
  );
}
