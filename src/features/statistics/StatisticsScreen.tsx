'use client';

import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { LineChart } from '@/components/charts/LineChart';
import type { HistoryPoint } from '@/types';
import { formatAxisMoney, formatAxisPerCapita } from '@/lib/format';
import { useGameStore } from '@/store/gameStore';

type MetricKey = keyof Pick<
  HistoryPoint,
  | 'gdp'
  | 'gdpPerCapita'
  | 'gdpGrowth'
  | 'inflation'
  | 'unemployment'
  | 'debtToGdp'
  | 'approval'
  | 'population'
  | 'balance'
>;

const METRICS: { key: MetricKey; label: string; format: (v: number) => string; zero?: boolean }[] =
  [
    { key: 'gdp', label: 'GDP', format: formatAxisMoney },
    { key: 'gdpPerCapita', label: '1인당 GDP', format: formatAxisPerCapita },
    { key: 'gdpGrowth', label: '성장률', format: (v) => `${v.toFixed(1)}%`, zero: true },
    { key: 'inflation', label: '물가상승률', format: (v) => `${v.toFixed(1)}%`, zero: true },
    { key: 'unemployment', label: '실업률', format: (v) => `${v.toFixed(1)}%` },
    { key: 'debtToGdp', label: '국가부채/GDP', format: (v) => `${v.toFixed(0)}%` },
    { key: 'approval', label: '지지율', format: (v) => `${v.toFixed(0)}%` },
    { key: 'population', label: '인구', format: (v) => `${(v / 1_000_000).toFixed(0)}M` },
    { key: 'balance', label: '재정수지', format: formatAxisMoney, zero: true },
  ];

const RANGES = [
  { label: '5년', quarters: 20 },
  { label: '10년', quarters: 40 },
  { label: '전체', quarters: Infinity },
];

export function StatisticsScreen() {
  const history = useGameStore((store) => store.game?.history ?? []);
  const [metric, setMetric] = useState<MetricKey>('gdp');
  const [range, setRange] = useState(1);

  const quarters = RANGES[range]?.quarters ?? 40;
  const sliced = Number.isFinite(quarters) ? history.slice(-quarters) : history;
  const labels = sliced.map((p) => `${String(p.year).slice(2)}·${p.quarter}Q`);
  const active = METRICS.find((m) => m.key === metric) ?? METRICS[0]!;

  const values = sliced.map((p) => p[metric]);
  const first = values[0];
  const last = values[values.length - 1];
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="지표 추이"
        description="분기별 기록입니다. 최근 40년(160분기)까지 보관합니다."
        actions={
          <div className="flex gap-1">
            {RANGES.map((option, index) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setRange(index)}
                className="rounded px-2 py-1 text-[11px] transition-colors"
                style={{
                  backgroundColor: range === index ? 'var(--color-accent-soft)' : 'transparent',
                  color: range === index ? 'var(--color-accent)' : 'var(--color-ink-muted)',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap gap-1.5">
          {METRICS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setMetric(option.key)}
              className="rounded-md border px-2.5 py-1 text-[11px] transition-colors"
              style={{
                borderColor: metric === option.key ? 'var(--color-accent)' : 'var(--color-line)',
                color: metric === option.key ? 'var(--color-accent)' : 'var(--color-ink-muted)',
                backgroundColor: metric === option.key ? 'var(--color-accent-soft)' : 'transparent',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <LineChart
          labels={labels}
          height={320}
          includeZero={active.zero}
          format={active.format}
          series={[{ key: active.key, label: active.label, values }]}
        />

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t pt-3 text-[12px] sm:grid-cols-4">
          <Fact label="시작" value={first === undefined ? '—' : active.format(first)} />
          <Fact label="현재" value={last === undefined ? '—' : active.format(last)} />
          <Fact label="최저" value={active.format(min)} />
          <Fact label="최고" value={active.format(max)} />
        </dl>
      </Panel>

      <Panel title="분기별 기록" description="가장 최근 12분기입니다.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[12px]">
            <thead>
              <tr className="text-[10px] text-[var(--color-ink-faint)]">
                <th className="pb-2 text-left font-medium">분기</th>
                <th className="pb-2 text-right font-medium">GDP</th>
                <th className="pb-2 text-right font-medium">성장률</th>
                <th className="pb-2 text-right font-medium">물가</th>
                <th className="pb-2 text-right font-medium">실업률</th>
                <th className="pb-2 text-right font-medium">부채/GDP</th>
                <th className="pb-2 text-right font-medium">지지율</th>
                <th className="pb-2 text-right font-medium">인구</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...history]
                .slice(-12)
                .reverse()
                .map((point) => (
                  <tr key={point.turn}>
                    <td className="tnum py-1.5">
                      {point.year}년 {point.quarter}분기
                    </td>
                    <td className="tnum py-1.5 text-right">{formatAxisMoney(point.gdp)}</td>
                    <td className="tnum py-1.5 text-right">{point.gdpGrowth.toFixed(1)}%</td>
                    <td className="tnum py-1.5 text-right">{point.inflation.toFixed(1)}%</td>
                    <td className="tnum py-1.5 text-right">{point.unemployment.toFixed(1)}%</td>
                    <td className="tnum py-1.5 text-right">{point.debtToGdp.toFixed(0)}%</td>
                    <td className="tnum py-1.5 text-right">{point.approval.toFixed(0)}%</td>
                    <td className="tnum py-1.5 text-right">
                      {(point.population / 1_000_000).toFixed(1)}M
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
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
