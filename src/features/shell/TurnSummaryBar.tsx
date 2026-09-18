'use client';

import { Button } from '@/components/ui/Button';
import { formatMoney, formatSigned } from '@/lib/format';
import { useGameStore } from '@/store/gameStore';

/**
 * 하단 고정 바: 직전 분기 결과 요약과 다음 분기 진행 버튼.
 *
 * 모바일에서는 하단 내비게이션 바로 위에 붙고(.turn-bar), 요약은 가로 스크롤 칩 줄이 된다.
 * 칩 줄은 자체 overflow-x 를 가지므로 문서 전체에 가로 스크롤을 만들지 않는다.
 */
export function TurnSummaryBar() {
  const summary = useGameStore((store) => store.lastSummary);
  const nextTurn = useGameStore((store) => store.nextTurn);
  const busy = useGameStore((store) => store.busy);
  const blocked = useGameStore((store) => store.game?.pendingEvent !== null);
  const gameOver = useGameStore((store) => store.game?.gameOver !== null);

  return (
    <div className="turn-bar fixed inset-x-0 z-30 flex items-center gap-2 border-t bg-[var(--color-surface)] px-3 py-2 md:gap-5 md:px-5 md:py-2.5">
      <div className="no-scrollbar -mx-1 flex min-w-0 flex-1 items-center gap-x-3.5 overflow-x-auto px-1 md:mx-0 md:flex-wrap md:gap-x-5 md:gap-y-1 md:overflow-visible md:px-0">
        {summary ? (
          <>
            <Item label="성장률" value={`${summary.gdpGrowth.toFixed(1)}%`} />
            <Item label="물가" value={formatSigned(summary.inflationDelta)} invert />
            <Item label="실업률" value={formatSigned(summary.unemploymentDelta)} invert />
            <Item label="지지율" value={formatSigned(summary.approvalDelta)} />
            <Item label="재정수지" value={formatMoney(summary.balance)} />
            <Item label="부채/GDP" value={formatSigned(summary.debtDelta)} invert />
          </>
        ) : (
          <span className="whitespace-nowrap text-[11px] text-[var(--color-ink-faint)] md:whitespace-normal">
            예산과 세율을 확인한 뒤 다음 분기로 진행하세요.
          </span>
        )}
      </div>

      <Button
        variant="primary"
        onClick={nextTurn}
        disabled={busy || blocked || gameOver}
        className="shrink-0"
      >
        {blocked ? '결정 필요' : '다음 분기 →'}
      </Button>
    </div>
  );
}

function Item({
  label,
  value,
  invert = false,
}: {
  label: string;
  value: string;
  invert?: boolean;
}) {
  const numeric = Number.parseFloat(value.replace(/[^0-9.+-]/g, ''));
  const positive = Number.isFinite(numeric) && numeric > 0;
  const negative = Number.isFinite(numeric) && numeric < 0;
  const good = invert ? negative : positive;
  const bad = invert ? positive : negative;

  return (
    <span className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-[11px] text-[var(--color-ink-faint)] md:text-[10px]">{label}</span>
      <span
        className="tnum text-[12px] font-medium"
        style={{
          color: good
            ? 'var(--color-positive)'
            : bad
              ? 'var(--color-negative)'
              : 'var(--color-ink)',
        }}
      >
        {value}
      </span>
    </span>
  );
}
