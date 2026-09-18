'use client';

import { Button } from '@/components/ui/Button';
import { formatMoney, formatSigned } from '@/lib/format';
import { useGameStore } from '@/store/gameStore';

/** 하단 고정 바: 직전 분기 결과 요약과 다음 분기 진행 버튼. */
export function TurnSummaryBar() {
  const summary = useGameStore((store) => store.lastSummary);
  const nextTurn = useGameStore((store) => store.nextTurn);
  const busy = useGameStore((store) => store.busy);
  const blocked = useGameStore((store) => store.game?.pendingEvent !== null);
  const gameOver = useGameStore((store) => store.game?.gameOver !== null);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-5 border-t bg-[var(--color-surface)] px-5 py-2.5">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-1">
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
          <span className="text-[11px] text-[var(--color-ink-faint)]">
            예산과 세율을 확인한 뒤 다음 분기로 진행하세요.
          </span>
        )}
      </div>

      <Button variant="primary" onClick={nextTurn} disabled={busy || blocked || gameOver}>
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
    <span className="flex items-baseline gap-1.5">
      <span className="text-[10px] text-[var(--color-ink-faint)]">{label}</span>
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
