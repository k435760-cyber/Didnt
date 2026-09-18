'use client';

import { useEffect, useState } from 'react';
import { useGameStore, type Screen } from '@/store/gameStore';
import { AuthButton } from '@/features/auth/AuthButton';
import { NavIcon } from './NavIcon';
import { PRIMARY_SCREENS, SECONDARY_SCREENS, navItem } from './navItems';

/**
 * 모바일 전용 하단 고정 내비게이션.
 *
 * 자주 쓰는 4개 화면을 직접 노출하고, 나머지는 '더보기' 시트에 넣는다.
 * 높이는 --bottom-nav-height 와 맞춰 두었고, safe-area 만큼 아래 여백을 더한다.
 */
export function BottomNav() {
  const screen = useGameStore((store) => store.screen);
  const setScreen = useGameStore((store) => store.setScreen);
  const wars = useGameStore((store) => store.game?.wars.length ?? 0);
  const pendingEvent = useGameStore((store) => store.game?.pendingEvent?.eventId ?? null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // 시트가 열린 동안 배경 스크롤을 막고, 뒤로가기 대신 Esc 로 닫을 수 있게 한다.
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSheetOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [sheetOpen]);

  const go = (next: Screen) => {
    setScreen(next);
    setSheetOpen(false);
  };

  const secondaryActive = SECONDARY_SCREENS.includes(screen);
  const secondaryAlert = wars > 0 || pendingEvent !== null;

  return (
    <>
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          <button
            type="button"
            aria-label="더보기 닫기"
            className="absolute inset-0 bg-black/45"
            onClick={() => setSheetOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="더보기"
            className="sheet-up relative max-h-[80dvh] overflow-y-auto rounded-t-2xl border-t bg-[var(--color-surface)] px-4 pt-3"
            style={{ paddingBottom: 'calc(var(--safe-bottom) + 16px)' }}
          >
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-[var(--color-line-strong)]" />

            <h2 className="mb-2 text-[12px] font-semibold text-[var(--color-ink-muted)]">화면</h2>
            <div className="grid grid-cols-3 gap-2">
              {SECONDARY_SCREENS.map((key) => {
                const item = navItem(key);
                const active = screen === key;
                const badge = key === 'military' && wars > 0 ? String(wars) : null;
                const alert = key === 'news' && pendingEvent !== null;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => go(key)}
                    aria-current={active ? 'page' : undefined}
                    className="relative flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-lg border text-[12px] font-medium transition-colors"
                    style={{
                      borderColor: active ? 'var(--color-accent)' : 'var(--color-line)',
                      backgroundColor: active ? 'var(--color-accent-soft)' : 'transparent',
                      color: active ? 'var(--color-accent)' : 'var(--color-ink-muted)',
                    }}
                  >
                    <NavIcon screen={key} size={19} />
                    {item.short}
                    {badge && (
                      <span
                        className="tnum absolute right-1.5 top-1.5 rounded px-1 text-[10px] font-semibold"
                        style={{
                          backgroundColor: 'var(--color-negative-soft)',
                          color: 'var(--color-negative)',
                        }}
                      >
                        {badge}
                      </span>
                    )}
                    {alert && (
                      <span
                        className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: 'var(--color-negative)' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <h2 className="mb-2 mt-5 text-[12px] font-semibold text-[var(--color-ink-muted)]">
              게임
            </h2>
            <GameActions onDone={() => setSheetOpen(false)} />
          </div>
        </div>
      )}

      <nav
        aria-label="주 메뉴"
        className="bottom-nav fixed inset-x-0 bottom-0 z-40 flex border-t bg-[var(--color-surface)] md:hidden"
      >
        {PRIMARY_SCREENS.map((key) => {
          const item = navItem(key);
          const active = screen === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => go(key)}
              aria-current={active ? 'page' : undefined}
              className="flex h-[58px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors"
              style={{ color: active ? 'var(--color-accent)' : 'var(--color-ink-faint)' }}
            >
              <NavIcon screen={key} />
              {item.short}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
          aria-haspopup="dialog"
          className="relative flex h-[58px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors"
          style={{ color: secondaryActive ? 'var(--color-accent)' : 'var(--color-ink-faint)' }}
        >
          <NavIcon screen="more" />
          더보기
          {secondaryAlert && !secondaryActive && (
            <span
              className="absolute right-[26%] top-2.5 h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: 'var(--color-negative)' }}
            />
          )}
        </button>
      </nav>
    </>
  );
}

/** 더보기 시트 안의 저장/불러오기/초기화/로그인. 모바일 상단 바를 비워 두기 위해 여기로 모았다. */
function GameActions({ onDone }: { onDone: () => void }) {
  const saveGame = useGameStore((store) => store.saveGame);
  const loadGame = useGameStore((store) => store.loadGame);
  const resetGame = useGameStore((store) => store.resetGame);
  const seed = useGameStore((store) => store.game?.seed ?? '');

  const run = (action: () => void) => () => {
    action();
    onDone();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        <SheetButton label="저장" onClick={run(saveGame)} />
        <SheetButton label="불러오기" onClick={run(() => loadGame('manual'))} />
        <SheetButton label="초기화" onClick={run(resetGame)} tone="danger" />
      </div>
      <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
        <span className="tnum min-w-0 truncate text-[12px] text-[var(--color-ink-muted)]">
          시드 {seed}
        </span>
        <AuthButton />
      </div>
    </div>
  );
}

function SheetButton({
  label,
  onClick,
  tone = 'normal',
}: {
  label: string;
  onClick: () => void;
  tone?: 'normal' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-11 rounded-lg border text-[13px] font-medium transition-colors"
      style={{ color: tone === 'danger' ? 'var(--color-negative)' : 'var(--color-ink)' }}
    >
      {label}
    </button>
  );
}
