'use client';

import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Slider } from '@/components/ui/Slider';
import { PreviewList } from '@/components/ui/PreviewList';
import { BUDGET_CATEGORIES } from '@/types/fiscal';
import type { BudgetCategory, NationState } from '@/types';
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

  return (
    <div className="grid min-w-0 gap-3.5 md:gap-5 xl:grid-cols-[1.3fr_1fr]">
      <Panel
        title="예산 배분"
        description={`항목별 GDP 대비 지출 비율입니다. 한 분기에 항목당 ±${limit}%p 까지 조정할 수 있습니다.`}
        hideDescriptionOnMobile
        actions={
          <div className="text-right">
            <span className="block whitespace-nowrap text-[11px] text-[var(--color-ink-faint)] md:text-[10px]">
              총지출 (GDP 대비)
            </span>
            <span className="tnum whitespace-nowrap text-sm font-semibold">
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
              /* 터치에는 hover 가 없으므로 포인터 접촉과 포커스 양쪽에서 선택된다. */
              onPointerDown={() => setFocused(category)}
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
              {/*
                모바일에서는 오른쪽 상세 패널이 화면 한참 아래에 있으므로,
                조작 중인 항목의 효과를 슬라이더 바로 밑에 붙여 보여준다.
              */}
              {focused === category && (
                <div className="pb-3 xl:hidden">
                  <PreviewList
                    preview={previewBudgetChange(
                      category,
                      applied[category],
                      budget[category],
                      nation,
                    )}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex min-w-0 flex-col gap-3.5 md:gap-5">
        <Panel
          title={`${BUDGET_LABELS[focused]} 예산`}
          description="항목을 선택하면 내용이 바뀝니다."
          hideDescriptionOnMobile
        >
          <CategoryDetail category={focused} applied={applied} budget={budget} nation={nation} />
        </Panel>

        <Panel title="재정 요약">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[12px] md:gap-x-5">
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

/** 선택한 예산 항목의 예상 효과와 장단점. 모바일/데스크톱에서 같은 내용을 쓴다. */
function CategoryDetail({
  category,
  applied,
  budget,
  nation,
}: {
  category: BudgetCategory;
  applied: Record<BudgetCategory, number>;
  budget: Record<BudgetCategory, number>;
  nation: NationState;
}) {
  const effects = BUDGET_EFFECTS[category];

  return (
    <>
      <PreviewList
        preview={previewBudgetChange(category, applied[category], budget[category], nation)}
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-2 md:mt-4 md:gap-4">
        <div>
          <h4 className="text-[11px] font-semibold text-[var(--color-positive)]">장점</h4>
          <ul className="mt-1.5 flex flex-col gap-1">
            {effects.gains.map((gain) => (
              <li key={gain} className="text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                · {gain}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-[11px] font-semibold text-[var(--color-negative)]">단점</h4>
          <ul className="mt-1.5 flex flex-col gap-1">
            {effects.costs.map((cost) => (
              <li key={cost} className="text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                · {cost}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
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
