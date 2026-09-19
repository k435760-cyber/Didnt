'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TURNS_PER_YEAR } from '@/config/constants';
import { formatMoney, formatSigned } from '@/lib/format';
import { useGameStore } from '@/store/gameStore';

/**
 * 턴 진행 바.
 *
 * 모바일은 세로 2단이다.
 *   1단 — 이번 분기 핵심 결과 3개(성장/물가/지지율). 누르면 나머지 3개가 펼쳐진다.
 *   2단 — 다음 분기로 진행하는 전폭 CTA.
 * 가로 스크롤을 쓰지 않으므로 어떤 폭에서도 지표가 잘리거나 버튼과 겹치지 않는다.
 *
 * 데스크톱(md 이상)은 기존처럼 한 줄에 6개 지표와 버튼을 나란히 둔다.
 */
export function TurnBar() {
  const summary = useGameStore((store) => store.lastSummary);
  const nextTurn = useGameStore((store) => store.nextTurn);
  const busy = useGameStore((store) => store.busy);
  const blocked = useGameStore((store) => store.game?.pendingEvent !== null);
  const gameOver = useGameStore((store) => store.game?.gameOver !== null);
  const turn = useGameStore((store) => store.game?.turn ?? 0);
  const startYear = useGameStore((store) => store.game?.startYear ?? 0);

  // 펼침 상태는 '몇 번째 턴의 펼침인가'로 들고 있는다.
  // 턴이 넘어가면 값이 자연히 달라지므로 따로 초기화할 필요가 없다.
  const [expandedTurn, setExpandedTurn] = useState<number | null>(null);
  const expanded = expandedTurn === turn;
  const ref = useRef<HTMLDivElement>(null);

  // 바 높이는 내용(요약 유무·펼침 여부)에 따라 달라진다.
  // 실측값을 CSS 변수로 올려 본문 padding-bottom 과 항상 일치시킨다.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    // contentRect 는 padding·border 를 빼고 재므로 offsetHeight(=border-box)를 쓴다.
    const apply = () => {
      document.documentElement.style.setProperty(
        '--turn-bar-height',
        `${Math.round(element.offsetHeight)}px`,
      );
    };

    const observer = new ResizeObserver(apply);
    observer.observe(element);
    apply();

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--turn-bar-height');
    };
  }, []);

  const nextIndex = turn + 1;
  const nextYear = startYear + Math.floor(nextIndex / TURNS_PER_YEAR);
  const nextQuarter = (nextIndex % TURNS_PER_YEAR) + 1;

  const disabled = busy || blocked || gameOver;
  const ctaLabel = gameOver
    ? '임기 종료'
    : blocked
      ? '결정을 내려야 합니다'
      : `${nextYear}년 ${nextQuarter}분기로 진행`;

  const primary = summary
    ? [
        { label: '성장', value: `${summary.gdpGrowth.toFixed(1)}%`, invert: false },
        { label: '물가', value: formatSigned(summary.inflationDelta), invert: true },
        { label: '지지율', value: formatSigned(summary.approvalDelta), invert: false },
      ]
    : [];

  const secondary = summary
    ? [
        { label: '실업률', value: formatSigned(summary.unemploymentDelta), invert: true },
        { label: '재정수지', value: formatMoney(summary.balance), invert: false },
        { label: '부채/GDP', value: formatSigned(summary.debtDelta), invert: true },
      ]
    : [];

  return (
    <div
      ref={ref}
      className="turn-bar fixed inset-x-0 z-30 border-t bg-[var(--color-surface)] px-3 py-2 md:flex md:items-center md:gap-5 md:px-5 md:py-2.5"
    >
      {/* ── 모바일: 결과 요약 + 펼치기 ─────────────────────────────────── */}
      {summary ? (
        <>
          <button
            type="button"
            onClick={() => setExpandedTurn(expanded ? null : turn)}
            aria-expanded={expanded}
            className="flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left md:hidden"
          >
            <span className="grid flex-1 grid-cols-3 gap-1.5">
              {primary.map((item) => (
                <Metric key={item.label} {...item} />
              ))}
            </span>
            <Chevron open={expanded} />
          </button>

          {expanded && (
            <div className="mt-1.5 grid grid-cols-3 gap-1.5 border-t px-1 pt-2 md:hidden">
              {secondary.map((item) => (
                <Metric key={item.label} {...item} />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="px-1 pb-1.5 text-[12px] text-[var(--color-ink-faint)] md:hidden">
          예산과 세율을 확인한 뒤 분기를 진행하세요.
        </p>
      )}

      {/* ── 데스크톱: 기존 한 줄 배치 ───────────────────────────────────── */}
      <div className="hidden min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-1 md:flex">
        {summary ? (
          [...primary, ...secondary].map((item) => <InlineMetric key={item.label} {...item} />)
        ) : (
          <span className="text-[11px] text-[var(--color-ink-faint)]">
            예산과 세율을 확인한 뒤 다음 분기로 진행하세요.
          </span>
        )}
      </div>

      <Button
        variant="primary"
        size="cta"
        onClick={nextTurn}
        disabled={disabled}
        className="mt-1.5 w-full md:mt-0 md:w-auto md:shrink-0"
      >
        <span className="md:hidden">{ctaLabel}</span>
        <span className="hidden md:inline">
          {blocked ? '결정 필요' : gameOver ? '임기 종료' : '다음 분기 →'}
        </span>
        {!disabled && <span className="md:hidden">→</span>}
      </Button>
    </div>
  );
}

function toneOf(value: string, invert: boolean): string {
  const numeric = Number.parseFloat(value.replace(/[^0-9.+-]/g, ''));
  if (!Number.isFinite(numeric) || numeric === 0) return 'var(--color-ink)';
  const positive = numeric > 0;
  const good = invert ? !positive : positive;
  return good ? 'var(--color-positive)' : 'var(--color-negative)';
}

/** 모바일 요약 칸. 고정 폭 없이 3등분 그리드를 채우므로 겹칠 수 없다. */
function Metric({ label, value, invert }: { label: string; value: string; invert: boolean }) {
  return (
    <span className="flex min-w-0 flex-col leading-tight">
      <span className="truncate text-[10px] text-[var(--color-ink-faint)]">{label}</span>
      <span
        className="tnum truncate text-[13px] font-semibold"
        style={{ color: toneOf(value, invert) }}
      >
        {value}
      </span>
    </span>
  );
}

function InlineMetric({ label, value, invert }: { label: string; value: string; invert: boolean }) {
  return (
    <span className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-[10px] text-[var(--color-ink-faint)]">{label}</span>
      <span className="tnum text-[12px] font-medium" style={{ color: toneOf(value, invert) }}>
        {value}
      </span>
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-ink-faint)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 transition-transform"
      style={{ transform: open ? 'rotate(180deg)' : undefined }}
      aria-hidden="true"
    >
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}
