'use client';

import { Panel } from '@/components/ui/Panel';
import { LineChart } from '@/components/charts/LineChart';
import { Slider } from '@/components/ui/Slider';
import { PreviewList } from '@/components/ui/PreviewList';
import { Button } from '@/components/ui/Button';
import { previewRateChange } from '@/simulation/government/preview';
import { taylorRate } from '@/simulation/economy/monetary';
import { FISCAL } from '@/config/fiscal';
import { formatAxisMoney, formatMoney, formatPercent } from '@/lib/format';
import { useGameStore } from '@/store/gameStore';

export function EconomyScreen() {
  const game = useGameStore((store) => store.game);
  const setPolicyRate = useGameStore((store) => store.setPolicyRate);
  const setCentralBankAuto = useGameStore((store) => store.setCentralBankAuto);

  if (!game) return null;

  const nation = game.nations[game.playerCountry];
  const history = game.history.slice(-40);
  const labels = history.map((p) => `${String(p.year).slice(2)}·${p.quarter}Q`);
  const { economy, fiscal, policy, lastAppliedPolicy } = nation;

  const suggested = taylorRate(
    {
      inflation: economy.inflation,
      growth: economy.gdpGrowth,
      potentialGrowth: economy.potentialGrowth,
    },
    nation.calibration.taylor,
  );
  const step = FISCAL.changeLimits.policyRatePerTurn;

  return (
    <div className="grid min-w-0 gap-3.5 md:gap-5 xl:grid-cols-2">
      <Panel title="GDP 추이" description="실질 GDP, 연율 기준입니다." hideDescriptionOnMobile>
        <LineChart
          labels={labels}
          format={formatAxisMoney}
          series={[{ key: 'gdp', label: 'GDP', values: history.map((p) => p.gdp) }]}
        />
      </Panel>

      <Panel
        title="물가와 실업률"
        description="두 지표는 대체로 반대 방향으로 움직입니다."
        hideDescriptionOnMobile
      >
        <LineChart
          labels={labels}
          includeZero
          format={(v) => `${v.toFixed(1)}%`}
          series={[
            { key: 'inflation', label: '물가상승률', values: history.map((p) => p.inflation) },
            { key: 'unemployment', label: '실업률', values: history.map((p) => p.unemployment) },
          ]}
        />
      </Panel>

      <Panel
        title="국가부채 비율"
        description="GDP 대비 %. 물가와 성장은 이 비율을 낮추는 방향으로 작용합니다."
        hideDescriptionOnMobile
      >
        <LineChart
          labels={labels}
          format={(v) => `${v.toFixed(0)}%`}
          series={[{ key: 'debt', label: '국가부채/GDP', values: history.map((p) => p.debtToGdp) }]}
        />
      </Panel>

      <Panel title="수요 구성" description="C + I + G + (수출 − 수입) = GDP">
        <div className="flex flex-col gap-2">
          <Component label="민간 소비" value={economy.consumption} gdp={economy.gdp} />
          <Component label="투자" value={economy.investment} gdp={economy.gdp} />
          <Component label="정부지출" value={economy.governmentSpending} gdp={economy.gdp} />
          <Component label="수출" value={economy.exports} gdp={economy.gdp} />
          <Component label="수입" value={-economy.imports} gdp={economy.gdp} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t pt-3 text-[12px] md:gap-x-5">
          <Fact label="정부 세입" value={formatMoney(fiscal.revenue)} />
          <Fact label="정부 지출" value={formatMoney(fiscal.expenditure)} />
          <Fact label="재정수지" value={formatMoney(fiscal.balance)} />
          <Fact label="국가부채" value={formatMoney(fiscal.debt)} />
          <Fact label="무역수지" value={formatMoney(economy.exports - economy.imports)} />
          <Fact label="국채 조달금리" value={formatPercent(fiscal.interestRate, 2)} />
        </dl>
      </Panel>

      <Panel
        title="통화정책"
        description="기준금리는 물가를 누르지만 소비와 투자를 함께 줄입니다."
        actions={
          <Button
            variant={policy.centralBankAuto ? 'primary' : 'secondary'}
            onClick={() => setCentralBankAuto(!policy.centralBankAuto)}
          >
            {policy.centralBankAuto ? '중앙은행 독립 운용 중' : '직접 운용 중'}
          </Button>
        }
        className="xl:col-span-2"
      >
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          <div>
            <Slider
              label="기준금리"
              deltaSuffix="%p"
              value={policy.policyRate}
              min={0}
              max={20}
              step={0.05}
              digits={2}
              baseline={lastAppliedPolicy.policyRate}
              allowed={{
                min: Math.max(lastAppliedPolicy.policyRate - step, 0),
                max: Math.min(lastAppliedPolicy.policyRate + step, 20),
              }}
              disabled={policy.centralBankAuto}
              onChange={setPolicyRate}
              hint={
                <PreviewList
                  preview={previewRateChange(lastAppliedPolicy.policyRate, policy.policyRate)}
                />
              }
            />
            {policy.centralBankAuto && (
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
                중앙은행이 테일러 준칙에 따라 금리를 조정하고 있습니다. 직접 운용으로 바꾸면 물가
                안정 책임도 함께 지게 됩니다.
              </p>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 self-start text-[12px] md:gap-x-5">
            <Fact label="현재 기준금리" value={formatPercent(economy.policyRate, 2)} />
            <Fact label="준칙 제시 금리" value={formatPercent(suggested, 2)} />
            <Fact
              label="실질금리"
              value={formatPercent(economy.policyRate - economy.inflation, 2)}
            />
            <Fact label="분기 조정 한도" value={`±${step.toFixed(2)}%p`} />
          </dl>
        </div>
      </Panel>
    </div>
  );
}

function Component({ label, value, gdp }: { label: string; value: number; gdp: number }) {
  const ratio = (value / Math.max(gdp, 1)) * 100;
  const negative = value < 0;
  return (
    <div className="flex items-center gap-2 text-[11px] md:text-[12px]">
      <span className="w-12 shrink-0 truncate text-[var(--color-ink-muted)] md:w-16">{label}</span>
      <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
        <span
          className="block h-full rounded-full"
          style={{
            width: `${Math.min(Math.abs(ratio), 100)}%`,
            backgroundColor: negative ? 'var(--color-series-2)' : 'var(--color-series-1)',
          }}
        />
      </span>
      <span className="tnum w-[68px] shrink-0 text-right md:w-24">
        {formatMoney(Math.abs(value))}
      </span>
      <span className="tnum w-10 shrink-0 text-right text-[var(--color-ink-faint)] md:w-12">
        {ratio.toFixed(1)}%
      </span>
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
