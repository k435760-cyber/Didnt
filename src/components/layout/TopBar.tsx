'use client';

import { Flag } from '@/components/Flag';
import { Button } from '@/components/ui/Button';
import { AuthButton } from '@/features/auth/AuthButton';
import { TURNS_PER_YEAR } from '@/config/constants';
import { TONE_COLOR, assessApproval } from '@/lib/assessment';
import { formatMoney, formatPercent, formatPeriod, formatTenure } from '@/lib/format';
import { useGameStore } from '@/store/gameStore';

/**
 * 상단 국가 표시줄.
 *
 * 모바일에서는 개요 화면에 같은 정보를 담은 국가 헤더가 따로 있으므로 숨기고,
 * 다른 화면에서만 '지금 어느 나라의 몇 분기인가'를 잡아 두는 최소 줄로 남는다.
 * 데스크톱에서는 저장/불러오기까지 포함한 기존 밀도를 유지한다.
 */
export function TopBar() {
  const country = useGameStore((store) => store.game?.playerCountry ?? null);
  const screen = useGameStore((store) => store.screen);
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
  const quartersInOffice = useGameStore((store) =>
    store.game ? store.game.nations[store.game.playerCountry].politics.quartersInOffice : 0,
  );
  const seed = useGameStore((store) => store.game?.seed ?? '');

  const saveGame = useGameStore((store) => store.saveGame);
  const loadGame = useGameStore((store) => store.loadGame);
  const resetGame = useGameStore((store) => store.resetGame);

  if (!country) return null;

  const year = startYear + Math.floor(turn / TURNS_PER_YEAR);
  const quarter = (turn % TURNS_PER_YEAR) + 1;
  const balanceRatio = (balance / Math.max(gdp, 1)) * 100;
  const approvalState = assessApproval(approval);

  return (
    <header
      className={`${screen === 'overview' ? 'hidden md:flex' : 'flex'} flex-wrap items-center gap-x-4 gap-y-2 border-b bg-[var(--color-surface)] px-3.5 py-2.5 md:gap-x-6 md:gap-y-3 md:px-5 md:py-3`}
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
            <span className="hidden md:inline">
              {` · ${formatTenure(quartersInOffice)} · 시드 ${seed}`}
            </span>
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-4 md:ml-0 md:gap-6">
        <HeaderFact
          label="지지율"
          value={formatPercent(approval, 0)}
          hint={approvalState.label}
          color={TONE_COLOR[approvalState.tone]}
        />
        <div className="hidden md:block">
          <HeaderFact
            label="재정수지"
            value={formatMoney(balance)}
            hint={`${balanceRatio >= 0 ? '+' : ''}${balanceRatio.toFixed(1)}%`}
            color={
              balance >= 0
                ? 'var(--color-positive)'
                : balanceRatio < -5
                  ? 'var(--color-negative)'
                  : 'var(--color-ink)'
            }
          />
        </div>
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
  color,
}: {
  label: string;
  value: string;
  hint?: string;
  color: string;
}) {
  return (
    <div className="leading-tight">
      <span className="block text-[11px] text-[var(--color-ink-faint)] md:text-[10px]">
        {label}
      </span>
      <span className="tnum block whitespace-nowrap text-[13px] font-semibold" style={{ color }}>
        {value}
        {hint && <span className="ml-1 text-[11px] font-normal opacity-80">{hint}</span>}
      </span>
    </div>
  );
}
