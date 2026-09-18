'use client';

import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Slider } from '@/components/ui/Slider';
import { PreviewList } from '@/components/ui/PreviewList';
import { LineChart } from '@/components/charts/LineChart';
import type { RevenueBreakdown } from '@/types';
import { FISCAL } from '@/config/fiscal';
import { computeRevenue, effectiveRate } from '@/simulation/economy/tax';
import { previewTaxChange } from '@/simulation/government/preview';
import { formatAxisMoney, formatMoney, formatPercent } from '@/lib/format';
import { useGameStore } from '@/store/gameStore';

type TaxKey = 'income' | 'corporate' | 'consumption';

const TAX_META: Record<TaxKey, { label: string; description: string }> = {
  income: {
    label: '소득세',
    description: '가장 큰 세원이지만, 올릴수록 가계 소비와 지지율이 함께 내려갑니다.',
  },
  corporate: {
    label: '법인세',
    description: '기업 투자와 산업 경쟁력에 직접 영향을 줍니다. 장기 성장률과 직결됩니다.',
  },
  consumption: {
    label: '소비세',
    description: '세수는 안정적이지만 인상 분기에 물가로 곧바로 전가됩니다.',
  },
};

export function TaxScreen() {
  const game = useGameStore((store) => store.game);
  const setTax = useGameStore((store) => store.setTax);
  const [focused, setFocused] = useState<TaxKey>('income');

  if (!game) return null;

  const nation = game.nations[game.playerCountry];
  const { tax } = nation.policy;
  const applied = nation.lastAppliedPolicy.tax;
  const limit = FISCAL.changeLimits.taxPerTurn;

  const projected = computeRevenue({
    gdp: nation.economy.gdp,
    consumption: nation.economy.consumption,
    tax,
    revenueCalibration: nation.calibration.revenue,
    modifierRevenue: 0,
  });
  const current = computeRevenue({
    gdp: nation.economy.gdp,
    consumption: nation.economy.consumption,
    tax: applied,
    revenueCalibration: nation.calibration.revenue,
    modifierRevenue: 0,
  });

  const history = game.history.slice(-32);
  const labels = history.map((p) => `${String(p.year).slice(2)}·${p.quarter}Q`);

  return (
    <div className="grid min-w-0 gap-3.5 md:gap-5 xl:grid-cols-2">
      <Panel
        title="세율"
        description={`한 분기에 세목당 ±${limit}%p 까지 조정할 수 있습니다.`}
        hideDescriptionOnMobile
      >
        <div className="divide-y">
          {(Object.keys(TAX_META) as TaxKey[]).map((key) => {
            const meta = TAX_META[key];
            const limits = FISCAL.taxLimits[key];
            return (
              <div
                key={key}
                onPointerDown={() => setFocused(key)}
                onFocusCapture={() => setFocused(key)}
                onMouseEnter={() => setFocused(key)}
              >
                <Slider
                  label={meta.label}
                  deltaSuffix="%p"
                  value={tax[key]}
                  min={limits.min}
                  max={limits.max}
                  step={0.5}
                  baseline={applied[key]}
                  allowed={{
                    min: Math.max(applied[key] - limit, limits.min),
                    max: Math.min(applied[key] + limit, limits.max),
                  }}
                  onChange={(value) => setTax(key, value)}
                  hint={
                    <p className="text-[12px] leading-relaxed text-[var(--color-ink-faint)] md:text-[11px]">
                      {meta.description} 실효 징수율{' '}
                      {formatPercent(effectiveRate(tax[key]) * 100, 1)}
                    </p>
                  }
                />
                {/* 모바일에서는 조작 중인 세목의 예상 효과를 바로 아래에 붙인다. */}
                {focused === key && (
                  <div className="pb-3 xl:hidden">
                    <PreviewList preview={previewTaxChange(key, applied[key], tax[key])} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="flex min-w-0 flex-col gap-3.5 md:gap-5">
        <Panel title={`${TAX_META[focused].label} 변경 효과`}>
          <div className="hidden xl:block">
            <PreviewList preview={previewTaxChange(focused, applied[focused], tax[focused])} />
          </div>

          <RevenueTable current={current} projected={projected} />

          <p className="mt-3 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
            표의 수치는 현재 GDP·소비를 기준으로 한 정태 추정입니다. 실제 세수는 다음 분기에
            소비·투자가 반응한 뒤 결정되므로 이보다 작거나 클 수 있습니다.
          </p>
        </Panel>

        <Panel
          title="재정수지 추이"
          description="연율 기준입니다. 0 아래는 적자입니다."
          hideDescriptionOnMobile
        >
          <LineChart
            labels={labels}
            includeZero
            height={200}
            format={formatAxisMoney}
            series={[{ key: 'balance', label: '재정수지', values: history.map((p) => p.balance) }]}
          />
        </Panel>
      </div>
    </div>
  );
}

/** 세목별 세수 비교. 모바일에서는 열 간격과 글자 크기를 줄여 가로 스크롤 없이 담는다. */
function RevenueTable({
  current,
  projected,
}: {
  current: RevenueBreakdown;
  projected: RevenueBreakdown;
}) {
  const rows: { label: string; current: number; next: number; strong?: boolean }[] = [
    { label: '소득세', current: current.income, next: projected.income },
    { label: '법인세', current: current.corporate, next: projected.corporate },
    { label: '소비세', current: current.consumption, next: projected.consumption },
    { label: '세외수입', current: current.other, next: projected.other },
    { label: '합계', current: current.total, next: projected.total, strong: true },
  ];

  return (
    <table className="mt-3 w-full table-fixed text-[12px] md:mt-4">
      <thead>
        <tr className="text-[11px] text-[var(--color-ink-faint)] md:text-[10px]">
          <th className="w-[22%] pb-1.5 text-left font-medium">세목</th>
          <th className="pb-1.5 text-right font-medium">현재 세수</th>
          <th className="pb-1.5 text-right font-medium">변경 후</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((row) => {
          const delta = row.next - row.current;
          return (
            <tr key={row.label} className={row.strong ? 'font-semibold' : ''}>
              <td className="py-1.5">{row.label}</td>
              <td className="tnum py-1.5 text-right whitespace-nowrap">
                {formatMoney(row.current)}
              </td>
              <td className="tnum py-1.5 text-right whitespace-nowrap">
                {formatMoney(row.next)}
                {Math.abs(delta) > 0.05 && (
                  <span
                    className="ml-1 text-[11px] md:text-[10px]"
                    style={{ color: delta > 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}
                  >
                    {delta > 0 ? '+' : ''}
                    {Math.round(delta * 10).toLocaleString('ko-KR')}억
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
