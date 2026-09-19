'use client';

import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Flag } from '@/components/Flag';
import { COUNTRY_IDS } from '@/types/country';
import { MILITARY } from '@/config/military';
import { combatStrength } from '@/simulation/military/war';
import { alliesOf } from '@/simulation/diplomacy/actions';
import { formatMoney, formatNumber } from '@/lib/format';
import { useGameStore } from '@/store/gameStore';

export function MilitaryScreen() {
  const game = useGameStore((store) => store.game);
  if (!game) return null;

  const player = game.playerCountry;
  const nation = game.nations[player];
  const { military } = nation;
  const defenseBudget = nation.economy.gdp * (nation.policy.budget.defense / 100);

  const ranking = COUNTRY_IDS.map((id) => ({
    id,
    name: game.nations[id].name,
    power: game.nations[id].military.power,
    troops: game.nations[id].military.troops,
    tech: game.nations[id].military.techLevel,
  })).sort((a, b) => b.power - a.power);

  return (
    <div className="grid min-w-0 gap-3.5 md:gap-5 xl:grid-cols-2">
      <Panel title="국방 태세">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-[12px] md:gap-x-6">
          <Fact label="군사력 지수" value={military.power.toFixed(0)} />
          <Fact label="병력" value={`${formatNumber(Math.round(military.troops))}명`} />
          <Fact label="기술 수준" value={`${military.techLevel.toFixed(0)}/100`} />
          <Fact label="준비도" value={`${military.readiness.toFixed(0)}/100`} />
          <Fact label="전쟁 피로도" value={`${military.warExhaustion.toFixed(0)}/100`} />
          <Fact
            label="국방예산"
            value={`${formatMoney(defenseBudget)} (GDP 대비 ${nation.policy.budget.defense.toFixed(1)}%)`}
          />
        </dl>

        <p className="mt-4 text-[12px] leading-relaxed text-[var(--color-ink-faint)] md:text-[11px]">
          준비도는 병력 규모 대비 국방예산으로 결정됩니다. 병력 100만 명당 GDP 대비{' '}
          {MILITARY.readiness.requiredPerMillionTroops}%의 예산이 필요하며, 모자라면 준비도가 서서히
          떨어집니다. 기술 수준은 국방예산과 연구개발 예산이 함께 끌어올립니다.
        </p>
      </Panel>

      <Panel
        title="세계 군사력 순위"
        description="전쟁 결과는 군사력만이 아니라 기술·경제력·동맹·피로도로 결정됩니다."
        hideDescriptionOnMobile
      >
        <ul className="flex flex-col gap-1">
          {ranking.map((entry, index) => (
            <li key={entry.id} className="flex min-w-0 items-center gap-2 text-[12px] md:gap-2.5">
              <span className="tnum w-4 text-[var(--color-ink-faint)]">{index + 1}</span>
              <Flag country={entry.id} size={20} />
              <span className="min-w-0 flex-1 truncate">{entry.name}</span>
              <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--color-surface-muted)] sm:w-24">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${(entry.power / Math.max(ranking[0]?.power ?? 1, 1)) * 100}%`,
                    backgroundColor:
                      entry.id === player ? 'var(--color-accent)' : 'var(--color-line-strong)',
                  }}
                />
              </span>
              <span className="tnum w-10 shrink-0 text-right font-medium">
                {entry.power.toFixed(0)}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="전황"
        description="전선 지수가 100에 도달하면 전쟁이 끝납니다."
        hideDescriptionOnMobile
        className="xl:col-span-2"
      >
        {game.wars.length === 0 ? (
          <p className="text-[12px] text-[var(--color-ink-faint)]">진행 중인 전쟁이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {game.wars.map((war, index) => {
              const attacker = game.nations[war.attacker];
              const defender = game.nations[war.defender];
              const attackerStrength = combatStrength({
                id: war.attacker,
                power: attacker.military.power,
                techLevel: attacker.military.techLevel,
                gdp: attacker.economy.gdp,
                defenseBudgetRatio: attacker.policy.budget.defense,
                warExhaustion: attacker.military.warExhaustion,
                allyPower: alliesOf(game.treaties, war.attacker).reduce(
                  (acc, id) => acc + game.nations[id].military.power,
                  0,
                ),
              });
              const defenderStrength = combatStrength({
                id: war.defender,
                power: defender.military.power,
                techLevel: defender.military.techLevel,
                gdp: defender.economy.gdp,
                defenseBudgetRatio: defender.policy.budget.defense,
                warExhaustion: defender.military.warExhaustion,
                allyPower: alliesOf(game.treaties, war.defender).reduce(
                  (acc, id) => acc + game.nations[id].military.power,
                  0,
                ),
              });
              const share = (attackerStrength / (attackerStrength + defenderStrength)) * 100;
              const frontRatio = ((war.frontline + 100) / 200) * 100;

              return (
                <li key={`${war.attacker}-${war.defender}-${index}`}>
                  <div className="flex flex-wrap items-center justify-between gap-y-1.5 text-[12px]">
                    <span className="flex items-center gap-2">
                      <Flag country={war.attacker} size={18} />
                      {attacker.name}
                      <Badge tone="negative">공격</Badge>
                    </span>
                    <span className="order-last w-full text-[11px] text-[var(--color-ink-faint)] sm:order-none sm:w-auto sm:text-center">
                      누적 전비 {formatMoney(war.cost)}
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge tone="neutral">방어</Badge>
                      {defender.name}
                      <Flag country={war.defender} size={18} />
                    </span>
                  </div>

                  <div className="mt-2">
                    <span className="mb-1 block text-[11px] text-[var(--color-ink-faint)]">
                      전선 (오른쪽으로 갈수록 공격측 우세)
                    </span>
                    <div className="relative h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                      <span
                        className="absolute inset-y-0 w-1 rounded-full"
                        style={{
                          left: `calc(${Math.min(Math.max(frontRatio, 0), 100)}% - 2px)`,
                          backgroundColor: 'var(--color-accent)',
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <span className="mb-1 block text-[11px] text-[var(--color-ink-faint)]">
                      종합 전투력 {attackerStrength.toFixed(0)} : {defenderStrength.toFixed(0)}
                    </span>
                    <div className="flex h-2 overflow-hidden rounded-full">
                      <span
                        style={{ width: `${share}%`, backgroundColor: 'var(--color-series-2)' }}
                      />
                      <span
                        style={{
                          width: `${100 - share}%`,
                          backgroundColor: 'var(--color-series-1)',
                        }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
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
