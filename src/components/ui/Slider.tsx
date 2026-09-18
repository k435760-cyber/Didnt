'use client';

import type { ReactNode } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  /** 변화량 표기에 붙일 단위. 비율 지표는 %p 처럼 따로 지정한다. */
  deltaSuffix?: string;
  digits?: number;
  /** 직전 분기에 실제로 반영된 값. 변화량 표시 기준. */
  baseline?: number;
  /** 이번 분기에 조정 가능한 범위. 범위 밖은 트랙에 흐리게 표시한다. */
  allowed?: { min: number; max: number };
  disabled?: boolean;
  onChange: (value: number) => void;
  hint?: ReactNode;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.1,
  suffix = '%',
  deltaSuffix,
  digits = 1,
  baseline,
  allowed,
  disabled = false,
  onChange,
  hint,
}: SliderProps) {
  const delta = baseline === undefined ? 0 : value - baseline;
  const hasDelta = Math.abs(delta) >= 0.005;
  const span = max - min || 1;
  const toPercent = (v: number) => ((v - min) / span) * 100;

  return (
    <div className="py-2 md:py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <label className="min-w-0 truncate text-[14px] font-medium md:text-[13px]">{label}</label>
        <div className="flex shrink-0 items-baseline gap-2">
          {hasDelta && (
            <span
              className="tnum text-[12px] font-medium md:text-[11px]"
              style={{ color: delta > 0 ? 'var(--color-accent)' : 'var(--color-caution)' }}
            >
              {delta > 0 ? '+' : ''}
              {delta.toFixed(digits)}
              {deltaSuffix ?? suffix}
            </span>
          )}
          <span className="tnum text-[15px] font-semibold md:text-[13px]">
            {value.toFixed(digits)}
            {suffix}
          </span>
        </div>
      </div>

      {/* 세로 여백이 아니라 input 자체의 padding 으로 터치 영역을 확보한다(globals.css 참고). */}
      <div className="relative mt-1 md:mt-2">
        {allowed && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2">
            <div
              className="absolute h-1 rounded-full opacity-45"
              style={{
                left: `${Math.max(toPercent(allowed.min), 0)}%`,
                width: `${Math.min(toPercent(allowed.max) - toPercent(allowed.min), 100)}%`,
                backgroundColor: 'var(--color-accent)',
              }}
            />
          </div>
        )}
        <input
          type="range"
          className="relative w-full"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={label}
        />
      </div>

      {hint && <div className="mt-2 md:mt-1.5">{hint}</div>}
    </div>
  );
}
