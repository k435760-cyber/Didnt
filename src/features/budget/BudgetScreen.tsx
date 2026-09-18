'use client';

import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Slider } from '@/components/ui/Slider';
import { PreviewList } from '@/components/ui/PreviewList';
import { BUDGET_CATEGORIES } from '@/types/fiscal';
import type { BudgetCategory } from '@/types';
import { BUDGET_EFFECTS, BUDGET_LABELS, FISCAL } from '@/config/fiscal';
import { previewBudgetChange } from '@/simulation/government/preview';
import { totalBudgetRatio } from '@/simulation/economy/spending';
import { formatMoney } from '@/lib/format';
import { useGameStore } from '@/store/gameStore';

export function BudgetScreen() {
  const game = useGameStore((store) => store.game);
  const setBudget = useGameStore((store) => store.setBudget);
  const [focused, setFocused] = useState<BudgetCategory>('education');

  if (!game) return null;

  const nation = game.nations[game.playerCountry];
  const { budget } = nation.policy;
  const applied = nation.lastAppliedPolicy.budget;
  const total = totalBudgetRatio(budget);
  const appliedTotal = totalBudgetRatio(applied);
  const limit = FISCAL.changeLimits.budgetPerTurn;
  const effects = BUDGET_EFFECTS[focused];

  return (
    <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
      <Panel
        title="예산 배분"
        description={`항목별 GDP 대비 지출 비율입니다. 한 분기에 항목당 ±${limit}%p 까지 조정할 수 있습니다.`}
        actions={
          <div className="text-right">
            <span className="block whitespace-nowrap text-[10px] text-[var(--color-ink-faint)]">
              총지출 (GDP 대비)
            </span>
            <span className="tnum text-sm font-semibold">
              {total.toFixed(1)}%
              {Math.abs(total - appliedTotal) >= 0.05 && (
                <span
                  className="ml-1.5 text-[11px] font-medium"
                  style={{
                    color: total > appliedTotal ? 'var(--color-caution)' : 'var(--color-accent)',
                  }}
                >
                  {total > appliedTotal ? '+' : ''}
                  {(total - appliedTotal).toFixed(1)}%p
                </span>
              )}
            </span>
          </div>
        }
      >
        <div className="divide-y">
          {BUDGET_CATEGORIES.map((category) => (
            <div
              key={category}
              onFocusCapture={() => setFocused(category)}
              onMouseEnter={() => setFocused(category)}
            >
              <Slider
                label={BUDGET_LABELS[category]}
                deltaSuffix="%p"
                value={budget[category]}
                min={FISCAL.budgetLimits.min}
                max={FISCAL.budgetLimits.max}
                step={0.1}
                baseline={applied[category]}
                allowed={{
                  min: Math.max(applied[category] - limit, FISCAL.budgetLimits.min),
                  max: Math.min(applied[category] + limit, FISCAL.budgetLimits.max),
                }}
                onChange={(value) => setBudget(category, value)}
              />
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex flex-col gap-5">
        <Panel
          title={`${BUDGET_LABELS[focused]} 예산`}
          description="항목을 가리키면 내용이 바뀝니다."
        >
          <PreviewList
            preview={previewBudgetChange(focused, applied[focused], budget[focused], nation)}
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="text-[11px] font-semibold text-[var(--color-positive)]">장점</h4>
              <ul className="mt-1.5 flex flex-col gap-1">
                {effects.gains.map((gain) => (
                  <li
                    key={gain}
                    className="text-[11px] leading-relaxed text-[var(--color-ink-muted)]"
                  >
                    · {gain}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold text-[var(--color-negative)]">단점</h4>
              <ul className="mt-1.5 flex flex-col gap-1">
                {effects.costs.map((cost) => (
                  <li
                    key={cost}
                    className="text-[11px] leading-relaxed text-[var(--color-ink-muted)]"
                  >
                    · {cost}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>

        <Panel title="재정 요약">
          <dl className="grid grid-cols-2 gap-x-5 gap-y-3 text-[12px]">
            <Fact label="세입 (연율)" value={formatMoney(nation.fiscal.revenue)} />
            <Fact label="지출 (연율)" value={formatMoney(nation.fiscal.expenditure)} />
            <Fact label="재정수지" value={formatMoney(nation.fiscal.balance)} />
            <Fact
              label="이자 비용"
              value={formatMoney(nation.fiscal.debt * (nation.fiscal.interestRate / 100))}
            />
            <Fact label="국가부채" value={formatMoney(nation.fiscal.debt)} />
            <Fact label="부채/GDP" value={`${nation.fiscal.debtToGdp.toFixed(1)}%`} />
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
            예산 변경은 다음 분기부터 반영됩니다. 복지·산업지원처럼 이전지출 성격이 큰 항목은
            정부지출(G)보다 가계 소비를 통해 경제에 들어옵니다.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--color-ink-faint)]">{label}</dt>
      <dd className="tnum font-medium">{value}</dd>
    </div>
  );
}
