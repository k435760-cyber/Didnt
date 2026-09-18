'use client';

import { useMemo, useState } from 'react';
import { useElementWidth } from './useElementWidth';
import { seriesColor } from './palette';

export interface ChartSeries {
  key: string;
  label: string;
  values: readonly number[];
}

interface LineChartProps {
  series: readonly ChartSeries[];
  /** x축 눈금 라벨. values 와 같은 길이여야 한다. */
  labels: readonly string[];
  format: (value: number) => string;
  height?: number;
  /** 0 을 항상 포함시킬지. 성장률처럼 부호가 중요한 지표에 쓴다. */
  includeZero?: boolean;
}

const PADDING = { top: 16, right: 16, bottom: 26, left: 52 };
const TICK_COUNT = 4;

function niceDomain(min: number, max: number): { min: number; max: number } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) return { min: min - 1, max: max + 1 };

  const span = max - min;
  const step = 10 ** Math.floor(Math.log10(span / TICK_COUNT));
  const normalized = span / TICK_COUNT / step;
  const multiplier = normalized > 5 ? 10 : normalized > 2 ? 5 : normalized > 1 ? 2 : 1;
  const tick = step * multiplier;

  return { min: Math.floor(min / tick) * tick, max: Math.ceil(max / tick) * tick };
}

export function LineChart({
  series,
  labels,
  format,
  height = 260,
  includeZero = false,
}: LineChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const domain = useMemo(() => {
    const all = series.flatMap((s) => s.values.filter(Number.isFinite));
    if (all.length === 0) return { min: 0, max: 1 };
    const rawMin = Math.min(...all, includeZero ? 0 : Infinity);
    const rawMax = Math.max(...all, includeZero ? 0 : -Infinity);
    return niceDomain(rawMin, rawMax);
  }, [series, includeZero]);

  const pointCount = Math.max(labels.length, 1);
  const plotWidth = Math.max(width - PADDING.left - PADDING.right, 40);
  const plotHeight = height - PADDING.top - PADDING.bottom;

  const xAt = (index: number): number =>
    PADDING.left + (pointCount <= 1 ? plotWidth / 2 : (index / (pointCount - 1)) * plotWidth);

  const yAt = (value: number): number => {
    const span = domain.max - domain.min || 1;
    const ratio = (value - domain.min) / span;
    return PADDING.top + plotHeight - ratio * plotHeight;
  };

  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i <= TICK_COUNT; i += 1) {
      out.push(domain.min + ((domain.max - domain.min) * i) / TICK_COUNT);
    }
    return out;
  }, [domain]);

  const xTickIndexes = useMemo(() => {
    if (pointCount <= 1) return [0];
    const desired = Math.min(6, pointCount);
    const step = (pointCount - 1) / (desired - 1 || 1);
    const out: number[] = [];
    for (let i = 0; i < desired; i += 1) out.push(Math.round(i * step));
    return Array.from(new Set(out));
  }, [pointCount]);

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - PADDING.left;
    const ratio = plotWidth <= 0 ? 0 : x / plotWidth;
    const index = Math.round(ratio * (pointCount - 1));
    setHover(index >= 0 && index < pointCount ? index : null);
  };

  const showLegend = series.length >= 2;
  const activeIndex = hover ?? pointCount - 1;

  return (
    <div ref={ref} className="w-full">
      {showLegend && (
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {series.map((s, index) => (
            <span
              key={s.key}
              className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-muted)]"
            >
              <span
                className="inline-block h-0.5 w-4 rounded-full"
                style={{ backgroundColor: seriesColor(index) }}
              />
              {s.label}
            </span>
          ))}
        </div>
      )}

      <svg
        width={width}
        height={height}
        role="img"
        aria-label={series.map((s) => s.label).join(', ')}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={yAt(tick)}
              y2={yAt(tick)}
              stroke="var(--color-grid)"
              strokeWidth={1}
            />
            <text
              x={PADDING.left - 8}
              y={yAt(tick) + 3}
              textAnchor="end"
              className="tnum"
              fontSize={10}
              fill="var(--color-ink-faint)"
            >
              {format(tick)}
            </text>
          </g>
        ))}

        {includeZero && domain.min < 0 && domain.max > 0 && (
          <line
            x1={PADDING.left}
            x2={width - PADDING.right}
            y1={yAt(0)}
            y2={yAt(0)}
            stroke="var(--color-line-strong)"
            strokeWidth={1}
          />
        )}

        {xTickIndexes.map((index) => (
          <text
            key={index}
            x={xAt(index)}
            y={height - 8}
            textAnchor="middle"
            fontSize={10}
            fill="var(--color-ink-faint)"
          >
            {labels[index] ?? ''}
          </text>
        ))}

        {series.map((s, index) => {
          const path = s.values
            .map(
              (value, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(value).toFixed(1)}`,
            )
            .join(' ');
          return (
            <path
              key={s.key}
              d={path}
              fill="none"
              stroke={seriesColor(index)}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {hover !== null && (
          <line
            x1={xAt(hover)}
            x2={xAt(hover)}
            y1={PADDING.top}
            y2={PADDING.top + plotHeight}
            stroke="var(--color-line-strong)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        {series.map((s, index) => {
          const value = s.values[activeIndex];
          if (value === undefined || !Number.isFinite(value)) return null;
          return (
            <circle
              key={`${s.key}-marker`}
              cx={xAt(activeIndex)}
              cy={yAt(value)}
              r={4}
              fill={seriesColor(index)}
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          );
        })}
      </svg>

      <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 px-1 text-[11px]">
        <span className="text-[var(--color-ink-faint)]">{labels[activeIndex] ?? ''}</span>
        {series.map((s, index) => {
          const value = s.values[activeIndex];
          return (
            <span key={`${s.key}-value`} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: seriesColor(index) }}
              />
              <span className="text-[var(--color-ink-muted)]">{s.label}</span>
              <span className="tnum font-medium text-[var(--color-ink)]">
                {value === undefined ? '—' : format(value)}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
