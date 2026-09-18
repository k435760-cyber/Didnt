'use client';

import { Flag } from '@/components/Flag';
import { Button } from '@/components/ui/Button';
import { AuthButton } from '@/features/auth/AuthButton';
import { formatMoney, formatPercent, formatPeriod } from '@/lib/format';
import { TURNS_PER_YEAR } from '@/config/constants';
import { useGameStore } from '@/store/gameStore';

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
    <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b bg-[var(--color-surface)] px-5 py-3">
      <div className="flex items-center gap-3">
        <Flag country={country} size={30} />
        <div>
          <h1 className="text-sm font-semibold leading-tight tracking-tight">{name}</h1>
          <p className="tnum text-[11px] text-[var(--color-ink-faint)]">
            {formatPeriod(year, quarter)} · 시드 {seed}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <HeaderFact
          label="지지율"
          value={formatPercent(approval, 0)}
          tone={approval >= 50 ? 'positive' : approval >= 30 ? 'neutral' : 'negative'}
        />
        <HeaderFact
          label="재정수지"
          value={`${formatMoney(balance)} (${balanceRatio >= 0 ? '+' : ''}${balanceRatio.toFixed(1)}%)`}
          tone={balance >= 0 ? 'positive' : balanceRatio < -5 ? 'negative' : 'neutral'}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" onClick={saveGame}>
          저장
        </Button>
        <Button size="sm" onClick={() => loadGame('manual')}>
          불러오기
        </Button>
        <Button size="sm" variant="ghost" onClick={resetGame}>
          초기화
        </Button>
        <AuthButton />
      </div>
    </header>
  );
}

function HeaderFact({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
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
      <span className="block text-[10px] text-[var(--color-ink-faint)]">{label}</span>
      <span className="tnum block text-[13px] font-semibold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
