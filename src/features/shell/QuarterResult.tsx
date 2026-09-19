'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TURNS_PER_YEAR } from '@/config/constants';
import { formatMoney, formatSigned } from '@/lib/format';
import { useGameStore } from '@/store/gameStore';
import type { NewsItem, TurnSummary } from '@/types';

/**
 * 분기 진행 직후 결과 브리핑.
 *
 * 값은 전부 엔진이 만든 lastSummary 와 이번 분기 뉴스에서 가져온다.
 * UI 가 결과를 따로 계산하지 않으며, 애니메이션으로 시간을 끌지 않고 언제든 닫을 수 있다.
 */
export function QuarterResult() {
  const turn = useGameStore((store) => store.game?.turn ?? 0);
  const startYear = useGameStore((store) => store.game?.startYear ?? 0);
  const summary = useGameStore((store) => store.lastSummary);
  const news = useGameStore((store) => store.game?.news ?? []);
  const pendingEvent = useGameStore((store) => store.game?.pendingEvent ?? null);
  const gameOver = useGameStore((store) => store.game?.gameOver ?? null);

  // '이번 턴 보고를 닫았는가'만 들고 있으면 나머지는 전부 파생된다.
  // 저장을 불러오면 lastSummary 가 비므로 지난 분기 보고가 다시 뜨지 않는다.
  const [dismissedTurn, setDismissedTurn] = useState<number | null>(null);

  const close = () => setDismissedTurn(turn);

  const visible =
    summary !== null &&
    summary.turn === turn &&
    dismissedTurn !== turn &&
    !gameOver &&
    // 결정이 필요한 이벤트가 있으면 그쪽이 먼저다.
    pendingEvent === null;

  // 빠르게 진행하는 플레이어를 막지 않도록 Esc 로도 닫는다.
  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') setDismissedTurn(turn);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, turn]);

  if (!visible || !summary) return null;

  const year = startYear + Math.floor(turn / TURNS_PER_YEAR);
  const quarter = (turn % TURNS_PER_YEAR) + 1;
  const headlines = news.filter((item) => item.turn === turn).slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <button type="button" aria-label="닫기" className="absolute inset-0" onClick={close} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${year}년 ${quarter}분기 결과`}
        className="sheet-up relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl border shadow-xl sm:max-w-[460px] sm:rounded-xl"
        style={{
          borderColor: 'var(--color-line)',
          backgroundColor: 'var(--color-surface)',
          paddingBottom: 'var(--safe-bottom)',
        }}
      >
        <header
          className="shrink-0 px-4 py-3.5 sm:px-5"
          style={{ backgroundColor: 'var(--color-command)', color: 'var(--color-command-ink)' }}
        >
          <div className="mx-auto mb-2.5 h-1 w-9 rounded-full bg-[var(--color-command-line)] sm:hidden" />
          <p className="text-[11px] tracking-wide" style={{ color: 'var(--color-command-muted)' }}>
            분기 보고
          </p>
          <h2 className="tnum mt-0.5 text-[17px] font-semibold tracking-tight">
            {year}년 {quarter}분기 결과
          </h2>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-3">
            <Result
              label="경제성장"
              value={`${summary.gdpGrowth.toFixed(1)}%`}
              good={summary.gdpGrowth > 0}
            />
            <Result
              label="물가"
              value={formatSigned(summary.inflationDelta)}
              good={summary.inflationDelta <= 0}
            />
            <Result
              label="실업률"
              value={formatSigned(summary.unemploymentDelta)}
              good={summary.unemploymentDelta <= 0}
            />
            <Result
              label="지지율"
              value={formatSigned(summary.approvalDelta)}
              good={summary.approvalDelta >= 0}
            />
            <Result
              label="재정수지"
              value={formatMoney(summary.balance)}
              good={summary.balance >= 0}
            />
            <Result
              label="부채/GDP"
              value={formatSigned(summary.debtDelta)}
              good={summary.debtDelta <= 0}
            />
          </dl>

          {headlines.length > 0 && (
            <section className="mt-5">
              <h3 className="rule-before text-[12px] font-semibold text-[var(--color-ink-muted)]">
                주요 변화
              </h3>
              <ul className="mt-2 flex flex-col gap-2">
                {headlines.map((item) => (
                  <Headline key={item.id} item={item} />
                ))}
              </ul>
            </section>
          )}

          {notes(summary).length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {notes(summary).map((note) => (
                <li
                  key={note}
                  className="text-[12px] leading-relaxed text-[var(--color-ink-muted)]"
                >
                  · {note}
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="shrink-0 border-t px-4 py-3 sm:px-5">
          <Button variant="primary" size="cta" onClick={close} className="w-full">
            계속
          </Button>
        </footer>
      </div>
    </div>
  );
}

function Result({ label, value, good }: { label: string; value: string; good: boolean }) {
  const neutral = /^[+-]?0(\.0)?%?p?$/.test(value.replace(/\s/g, ''));
  return (
    <div className="min-w-0 rounded-md border px-3 py-2">
      <dt className="truncate text-[11px] text-[var(--color-ink-faint)]">{label}</dt>
      <dd
        className="tnum mt-0.5 truncate text-[17px] font-semibold"
        style={{
          color: neutral
            ? 'var(--color-ink)'
            : good
              ? 'var(--color-positive)'
              : 'var(--color-negative)',
        }}
      >
        {value}
      </dd>
    </div>
  );
}

function Headline({ item }: { item: NewsItem }) {
  const color =
    item.tone === 'good'
      ? 'var(--color-positive)'
      : item.tone === 'bad'
        ? 'var(--color-negative)'
        : 'var(--color-line-strong)';

  return (
    <li className="flex gap-2.5">
      <span
        className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium leading-snug">{item.headline}</span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
          {item.body}
        </span>
      </span>
    </li>
  );
}

/** 요약 수치에서 바로 읽히는 해석 문장. 새 계산 없이 lastSummary 만 본다. */
function notes(summary: TurnSummary): string[] {
  const out: string[] = [];
  if (summary.populationDelta < 0) out.push('인구가 전분기보다 줄었습니다.');
  if (summary.debtDelta > 0.5) out.push('국가부채 비율이 눈에 띄게 올랐습니다.');
  if (summary.approvalDelta <= -2)
    out.push('지지율 하락 폭이 커 다음 분기 정책 여력이 줄어듭니다.');
  if (summary.inflationDelta >= 0.4) out.push('물가 상승 압력이 커지고 있습니다.');
  return out.slice(0, 3);
}
