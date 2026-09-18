'use client';

import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Flag } from '@/components/Flag';
import { COUNTRY_IDS } from '@/types/country';
import type { CountryId, DiplomaticActionType } from '@/types';
import { ACTION_LABELS, DIPLOMACY, PERSONALITY_LABELS, RELATION_LABELS } from '@/config/diplomacy';
import { getRelation, relationStatus } from '@/simulation/diplomacy/relations';
import { alliesOf, hasSanction, hasTreaty, validateAction } from '@/simulation/diplomacy/actions';
import { formatMoney } from '@/lib/format';
import { useGameStore } from '@/store/gameStore';

const ACTIONS: DiplomaticActionType[] = [
  'summit',
  'trade_agreement',
  'aid',
  'alliance',
  'sanction',
  'threaten',
];

export function DiplomacyScreen() {
  const game = useGameStore((store) => store.game);
  const runDiplomacy = useGameStore((store) => store.runDiplomacy);
  const startWar = useGameStore((store) => store.startWar);

  const others = COUNTRY_IDS.filter((id) => id !== game?.playerCountry);
  const [target, setTarget] = useState<CountryId>(others[0] ?? 'USA');

  if (!game) return null;

  const player = game.playerCountry;
  const relation = getRelation(game.relations, player, target);
  const status = relationStatus(relation);
  const targetNation = game.nations[target];
  const gdp = game.nations[player].economy.gdp;

  const atWar = game.wars.some(
    (war) =>
      (war.attacker === player && war.defender === target) ||
      (war.attacker === target && war.defender === player),
  );

  return (
    <div className="grid min-w-0 gap-3.5 md:gap-5 xl:grid-cols-[1fr_1.2fr]">
      <Panel
        title="관계도"
        description="-100(적대)에서 100(동맹) 사이로 관리됩니다."
        hideDescriptionOnMobile
      >
        <ul className="flex flex-col gap-1">
          {others.map((id) => {
            const value = getRelation(game.relations, player, id);
            const state = relationStatus(value);
            const selected = id === target;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setTarget(id)}
                  className="flex min-h-11 w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors md:gap-3 md:px-2.5"
                  style={{
                    backgroundColor: selected ? 'var(--color-accent-soft)' : 'transparent',
                  }}
                >
                  <Flag country={id} size={22} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                    {game.nations[id].name}
                  </span>
                  <span className="hidden sm:block">
                    <RelationBar value={value} />
                  </span>
                  <span className="tnum w-9 shrink-0 text-right text-[12px] font-medium">
                    {value.toFixed(0)}
                  </span>
                  <Badge
                    tone={
                      state === 'allied' || state === 'friendly'
                        ? 'positive'
                        : state === 'hostile' || state === 'tense'
                          ? 'negative'
                          : 'neutral'
                    }
                  >
                    {RELATION_LABELS[state]}
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      <div className="flex flex-col gap-5">
        <Panel
          title={`${targetNation.name}`}
          description={`성향: ${PERSONALITY_LABELS[targetNation.personality]} · 현재 관계 ${RELATION_LABELS[status]} (${relation.toFixed(0)})`}
        >
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[12px] sm:grid-cols-3 md:gap-x-6">
            <Fact label="GDP" value={formatMoney(targetNation.economy.gdp)} />
            <Fact label="군사력" value={targetNation.military.power.toFixed(0)} />
            <Fact label="성장률" value={`${targetNation.economy.gdpGrowth.toFixed(1)}%`} />
            <Fact label="물가" value={`${targetNation.economy.inflation.toFixed(1)}%`} />
            <Fact label="동맹국 수" value={String(alliesOf(game.treaties, target).length)} />
            <Fact
              label="협정"
              value={
                [
                  hasTreaty(game.treaties, 'alliance', player, target) ? '동맹' : null,
                  hasTreaty(game.treaties, 'trade', player, target) ? '무역협정' : null,
                  hasSanction(game.sanctions, player, target) ? '제재 중' : null,
                ]
                  .filter(Boolean)
                  .join(', ') || '없음'
              }
            />
          </dl>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {ACTIONS.map((action) => {
              const validation = validateAction({
                actor: player,
                target,
                type: action,
                relations: game.relations,
                treaties: game.treaties,
                sanctions: game.sanctions,
                turn: game.turn,
              });
              const effect = DIPLOMACY.actionEffects[action];
              const cost = gdp * effect.cost;

              return (
                <button
                  key={action}
                  type="button"
                  disabled={!validation.allowed}
                  onClick={() => runDiplomacy(action, target)}
                  title={validation.reason ?? undefined}
                  className="min-h-[52px] rounded-md border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 enabled:hover:bg-[var(--color-surface-muted)]"
                >
                  <span className="flex items-center justify-between">
                    <span className="text-[13px] font-medium md:text-[12px]">
                      {ACTION_LABELS[action]}
                    </span>
                    <span
                      className="tnum text-[11px]"
                      style={{
                        color:
                          effect.relation >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
                      }}
                    >
                      {effect.relation > 0 ? '+' : ''}
                      {effect.relation}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-[var(--color-ink-faint)]">
                    {validation.allowed
                      ? cost > 0
                        ? `비용 ${formatMoney(cost)}`
                        : '비용 없음'
                      : validation.reason}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel
          title="군사 행동"
          description="전쟁은 경제와 지지율에 즉시 큰 영향을 줍니다."
          hideDescriptionOnMobile
        >
          {atWar ? (
            <p className="text-[13px] leading-relaxed text-[var(--color-negative)] md:text-[12px]">
              현재 {targetNation.name}와(과) 교전 중입니다. 군사 화면에서 전황을 확인하세요.
            </p>
          ) : (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="text-[12px] leading-relaxed text-[var(--color-ink-muted)] md:text-[11px]">
                선전포고 시 관계도가 급락하고, 매 분기 GDP 대비 {(1.8).toFixed(1)}%의 전비와 성장률
                손실이 발생합니다.
              </p>
              <Button
                variant="danger"
                onClick={() => startWar(target)}
                className="w-full sm:w-auto"
              >
                선전포고
              </Button>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function RelationBar({ value }: { value: number }) {
  const ratio = (value + 100) / 200;
  return (
    <span className="relative h-1.5 w-20 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
      <span
        className="absolute inset-y-0 rounded-full"
        style={{
          left: `${Math.min(ratio, 0.5) * 100}%`,
          width: `${Math.abs(ratio - 0.5) * 100}%`,
          backgroundColor: value >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
        }}
      />
    </span>
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
