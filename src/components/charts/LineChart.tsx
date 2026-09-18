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
  /** 데스크톱 기준 높이. 좁은 화면에서는 자동으로 축소된다. */
  height?: number;
  /** 0 을 항상 포함시킬지. 성장률처럼 부호가 중요한 지표에 쓴다. */
  includeZero?: boolean;
  /** 화면 폭과 무관하게 높이를 유지한다. 통계 화면의 큰 차트에 쓴다. */
  fixedHeight?: boolean;
}

/** 폭이 이 값보다 좁으면 축·여백·글자 크기를 모바일용으로 줄인다. */
const COMPACT_WIDTH = 480;

interface Layout {
  padding: { top: number; right: number; bottom: number; left: number };
  yTicks: number;
  xTicks: number;
  fontSize: number;
  height: number;
}

function layoutFor(width: number, height: number, points: number, fixedHeight: boolean): Layout {
  const compact = width > 0 && width < COMPACT_WIDTH;

  if (!compact) {
    return {
      padding: { top: 16, right: 16, bottom: 26, left: 52 },
      yTicks: 4,
      xTicks: Math.min(6, Math.max(points, 1)),
      fontSize: 10,
      height,
    };
  }

  // 데이터가 몇 개 없을 때 텅 빈 큰 차트가 나오지 않도록 높이를 한 단계 더 줄인다.
  const sparse = points <= 2;
  const mobileHeight = fixedHeight ? height : Math.min(height, sparse ? 150 : 190);

  return {
    padding: { top: 12, right: 10, bottom: 22, left: 40 },
    yTicks: 3,
    xTicks: Math.min(points <= 4 ? points : 4, Math.max(points, 1)),
    fontSize: 10,
    height: mobileHeight,
  };
}

function niceDomain(min: number, max: number, tickCount: number): { min: number; max: number } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) return { min: min - 1, max: max + 1 };

  const span = max - min;
  const step = 10 ** Math.floor(Math.log10(span / tickCount));
  const normalized = span / tickCount / step;
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
  fixedHeight = false,
}: LineChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const pointCount = Math.max(labels.length, 1);
  const layout = layoutFor(width, height, labels.length, fixedHeight);
  const compact = width > 0 && width < COMPACT_WIDTH;

  const domain = useMemo(() => {
    const all = series.flatMap((s) => s.values.filter(Number.isFinite));
    if (all.length === 0) return { min: 0, max: 1 };
    const rawMin = Math.min(...all, includeZero ? 0 : Infinity);
    const rawMax = Math.max(...all, includeZero ? 0 : -Infinity);
    return niceDomain(rawMin, rawMax, layout.yTicks);
  }, [series, includeZero, layout.yTicks]);

  const plotWidth = Math.max(width - layout.padding.left - layout.padding.right, 20);
  const plotHeight = Math.max(layout.height - layout.padding.top - layout.padding.bottom, 20);

  const xAt = (index: number): number =>
    layout.padding.left +
    (pointCount <= 1 ? plotWidth / 2 : (index / (pointCount - 1)) * plotWidth);

  const yAt = (value: number): number => {
    const span = domain.max - domain.min || 1;
    const ratio = (value - domain.min) / span;
    return layout.padding.top + plotHeight - ratio * plotHeight;
  };

  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i <= layout.yTicks; i += 1) {
      out.push(domain.min + ((domain.max - domain.min) * i) / layout.yTicks);
    }
    return out;
  }, [domain, layout.yTicks]);

  const xTickIndexes = useMemo(() => {
    if (pointCount <= 1) return [0];
    const desired = Math.max(Math.min(layout.xTicks, pointCount), 2);
    const step = (pointCount - 1) / (desired - 1);
    const out: number[] = [];
    for (let i = 0; i < desired; i += 1) out.push(Math.round(i * step));
    return Array.from(new Set(out));
  }, [pointCount, layout.xTicks]);

  const selectIndex = (clientX: number, rect: DOMRect) => {
    const x = clientX - rect.left - layout.padding.left;
    const ratio = plotWidth <= 0 ? 0 : x / plotWidth;
    const index = Math.round(ratio * (pointCount - 1));
    setHover(index >= 0 && index < pointCount ? index : null);
  };

  const showLegend = series.length >= 2;
  const activeIndex = hover ?? pointCount - 1;

  return (
    <div ref={ref} className="w-full min-w-0">
      {showLegend && (
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 md:gap-x-4">
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
        height={layout.height}
        role="img"
        aria-label={series.map((s) => s.label).join(', ')}
        style={{ display: 'block', maxWidth: '100%', touchAction: 'pan-y' }}
        onMouseMove={(event) =>
          selectIndex(event.clientX, event.currentTarget.getBoundingClientRect())
        }
        onMouseLeave={() => setHover(null)}
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse') return;
          selectIndex(event.clientX, event.currentTarget.getBoundingClientRect());
        }}
        onPointerMove={(event) => {
          if (event.pointerType === 'mouse' || event.buttons === 0) return;
          selectIndex(event.clientX, event.currentTarget.getBoundingClientRect());
        }}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={layout.padding.left}
              x2={Math.max(width - layout.padding.right, layout.padding.left)}
              y1={yAt(tick)}
              y2={yAt(tick)}
              stroke="var(--color-grid)"
              strokeWidth={1}
            />
            <text
              x={layout.padding.left - 6}
              y={yAt(tick) + 3}
              textAnchor="end"
              className="tnum"
              fontSize={layout.fontSize}
              fill="var(--color-ink-faint)"
            >
              {format(tick)}
            </text>
          </g>
        ))}

        {includeZero && domain.min < 0 && domain.max > 0 && (
          <line
            x1={layout.padding.left}
            x2={Math.max(width - layout.padding.right, layout.padding.left)}
            y1={yAt(0)}
            y2={yAt(0)}
            stroke="var(--color-line-strong)"
            strokeWidth={1}
          />
        )}

        {xTickIndexes.map((index, position) => (
          <text
            key={index}
            x={xAt(index)}
            y={layout.height - 7}
            textAnchor={
              position === 0 ? 'start' : position === xTickIndexes.length - 1 ? 'end' : 'middle'
            }
            fontSize={layout.fontSize}
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
            <g key={s.key}>
              <path
                d={path}
                fill="none"
                stroke={seriesColor(index)}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* 점이 1~2개뿐이면 선이 보이지 않으므로 마커로 표시한다. */}
              {s.values.length <= 2 &&
                s.values.map((value, i) => (
                  <circle
                    key={`${s.key}-p${i}`}
                    cx={xAt(i)}
                    cy={yAt(value)}
                    r={3}
                    fill={seriesColor(index)}
                  />
                ))}
            </g>
          );
        })}

        {hover !== null && (
          <line
            x1={xAt(hover)}
            x2={xAt(hover)}
            y1={layout.padding.top}
            y2={layout.padding.top + plotHeight}
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
              r={compact ? 3.5 : 4}
              fill={seriesColor(index)}
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          );
        })}
      </svg>

      {/*
        값 읽기는 hover 에 의존하지 않는다. 기본값은 최신 분기이고,
        터치로 그래프를 훑으면 해당 분기 값으로 바뀐다.
      */}
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-0.5 text-[11px] md:gap-x-4">
        <span className="tnum text-[var(--color-ink-faint)]">{labels[activeIndex] ?? ''}</span>
        {series.map((s, index) => {
          const value = s.values[activeIndex];
          return (
            <span key={`${s.key}-value`} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
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
