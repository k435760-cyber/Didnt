'use client';

import { Flag } from '@/components/Flag';
import { Button } from '@/components/ui/Button';
import { AuthButton } from '@/features/auth/AuthButton';
import { formatMoney, formatPercent, formatPeriod } from '@/lib/format';
import { TURNS_PER_YEAR } from '@/config/constants';
import { useGameStore } from '@/store/gameStore';

/**
 * 상단 바.
 * 모바일에서는 국가·분기·지지율·재정수지만 한 줄에 담고,
 * 저장/불러오기/초기화/로그인은 하단 '더보기' 시트로 옮겼다.
 */
export function TopBar() {
  const country = useGameStore((store) => store.game?.playerCountry ?? null);
  const name = useGameStore((store) =>
    store.game ? store.game.nations[store.game.playerCountry].name : '',
  );
  const turn = useGameStore((store) => store.game?.turn ?? 0);
  const startYear = useGameStore((store) => store.game?.startYear ?? 0);
  const approval = useGameStore((store) =>
    store.game ? store.game.nations[store.game.playerCountry].politics.approval : 0,
  );
  const balance = useGameStore((store) =>
    store.game ? store.game.nations[store.game.playerCountry].fiscal.balance : 0,
  );
  const gdp = useGameStore((store) =>
    store.game ? store.game.nations[store.game.playerCountry].economy.gdp : 1,
  );
  const seed = useGameStore((store) => store.game?.seed ?? '');

  const saveGame = useGameStore((store) => store.saveGame);
  const loadGame = useGameStore((store) => store.loadGame);
  const resetGame = useGameStore((store) => store.resetGame);

  if (!country) return null;

  const year = startYear + Math.floor(turn / TURNS_PER_YEAR);
  const quarter = (turn % TURNS_PER_YEAR) + 1;
  const balanceRatio = (balance / Math.max(gdp, 1)) * 100;

  return (
    <header
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-[var(--color-surface)] px-3.5 py-2.5 md:gap-x-6 md:gap-y-3 md:px-5 md:py-3"
      style={{ paddingTop: 'calc(var(--safe-top) + 10px)' }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Flag country={country} size={28} />
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold leading-tight tracking-tight md:text-sm">
            {name}
          </h1>
          <p className="tnum truncate text-[11px] text-[var(--color-ink-faint)]">
            <span>{formatPeriod(year, quarter)}</span>
            <span className="hidden md:inline"> · 시드 {seed}</span>
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-4 md:ml-0 md:gap-6">
        <HeaderFact
          label="지지율"
          value={formatPercent(approval, 0)}
          tone={approval >= 50 ? 'positive' : approval >= 30 ? 'neutral' : 'negative'}
        />
        <HeaderFact
          label="재정수지"
          value={`${formatMoney(balance)}`}
          hint={`${balanceRatio >= 0 ? '+' : ''}${balanceRatio.toFixed(1)}%`}
          tone={balance >= 0 ? 'positive' : balanceRatio < -5 ? 'negative' : 'neutral'}
        />
      </div>

      {/* 데스크톱 전용 게임 조작. 모바일은 하단 더보기 시트에 같은 기능이 있다. */}
      <div className="ml-auto hidden items-center gap-2 md:flex">
        <Button size="sm" onClick={saveGame}>
          저장
        </Button>
        <Button size="sm" onClick={() => loadGame('manual')}>
          불러오기
        </Button>
        <Button size="sm" variant="ghost" onClick={resetGame}>
          초기화
        </Button>
        <AuthButton size="sm" />
      </div>
    </header>
  );
}

function HeaderFact({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: 'positive' | 'negative' | 'neutral';
}) {
  const color =
    tone === 'positive'
      ? 'var(--color-positive)'
      : tone === 'negative'
        ? 'var(--color-negative)'
        : 'var(--color-ink)';

  return (
    <div className="leading-tight">
      <span className="block text-[11px] text-[var(--color-ink-faint)] md:text-[10px]">
        {label}
      </span>
      <span className="tnum block whitespace-nowrap text-[13px] font-semibold" style={{ color }}>
        {value}
        {hint && <span className="ml-1 font-normal opacity-80">({hint})</span>}
      </span>
    </div>
  );
}
