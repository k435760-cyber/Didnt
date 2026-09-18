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

  const recent = [...history].slice(-12).reverse();

  return (
    <div className="flex min-w-0 flex-col gap-3.5 md:gap-5">
      <Panel
        title="지표 추이"
        description="분기별 기록입니다. 최근 40년(160분기)까지 보관합니다."
        hideDescriptionOnMobile
        actions={
          <div className="flex gap-1">
            {RANGES.map((option, index) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setRange(index)}
                className="h-11 rounded px-3 text-[12px] transition-colors md:h-auto md:px-2 md:py-1 md:text-[11px]"
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
        <div className="mb-3 flex flex-wrap gap-1.5 md:mb-4">
          {METRICS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setMetric(option.key)}
              className="h-10 rounded-md border px-3 text-[12px] transition-colors md:h-auto md:px-2.5 md:py-1 md:text-[11px]"
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

        {/* 통계 화면은 분석용이므로 모바일에서도 차트 높이를 충분히 유지한다. */}
        <LineChart
          labels={labels}
          height={280}
          fixedHeight
          includeZero={active.zero}
          format={active.format}
          series={[{ key: active.key, label: active.label, values }]}
        />

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t pt-3 text-[12px] sm:grid-cols-4 md:gap-x-6">
          <Fact label="시작" value={first === undefined ? '—' : active.format(first)} />
          <Fact label="현재" value={last === undefined ? '—' : active.format(last)} />
          <Fact label="최저" value={active.format(min)} />
          <Fact label="최고" value={active.format(max)} />
        </dl>
      </Panel>

      <Panel title="분기별 기록" description="가장 최근 12분기입니다." hideDescriptionOnMobile>
        {/* 모바일: 분기별 카드 / md 이상: 기존 표. 같은 데이터를 breakpoint 별로 렌더링한다. */}
        <ul className="flex flex-col gap-2 md:hidden">
          {recent.map((point) => (
            <li key={point.turn} className="rounded-lg border px-3 py-2.5">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="tnum text-[13px] font-semibold">
                  {point.year} {point.quarter}Q
                </span>
                <span
                  className="tnum text-[12px] font-medium"
                  style={{
                    color: point.gdpGrowth >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
                  }}
                >
                  성장률 {point.gdpGrowth >= 0 ? '+' : ''}
                  {point.gdpGrowth.toFixed(1)}%
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                <CardRow label="GDP" value={formatAxisMoney(point.gdp)} />
                <CardRow label="물가" value={`${point.inflation.toFixed(1)}%`} />
                <CardRow label="실업률" value={`${point.unemployment.toFixed(1)}%`} />
                <CardRow label="부채/GDP" value={`${point.debtToGdp.toFixed(0)}%`} />
                <CardRow label="지지율" value={`${point.approval.toFixed(0)}%`} />
                <CardRow label="인구" value={`${(point.population / 1_000_000).toFixed(1)}M`} />
              </dl>
            </li>
          ))}
        </ul>

        <div className="hidden md:block">
          <table className="w-full text-[12px]">
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
              {recent.map((point) => (
                <tr key={point.turn}>
                  <td className="tnum py-1.5 whitespace-nowrap">
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
    <div className="min-w-0">
      <dt className="text-[11px] text-[var(--color-ink-faint)]">{label}</dt>
      <dd className="tnum font-medium">{value}</dd>
    </div>
  );
}

function CardRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-2">
      <dt className="text-[var(--color-ink-faint)]">{label}</dt>
      <dd className="tnum font-medium">{value}</dd>
    </div>
  );
}
