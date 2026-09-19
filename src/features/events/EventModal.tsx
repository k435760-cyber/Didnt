'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { findEvent } from '@/simulation/events/catalog';
import type { EventCategory, Modifier, ModifierField } from '@/types';
import { useGameStore } from '@/store/gameStore';

const CATEGORY_LABEL: Record<EventCategory, string> = {
  economy: '경제',
  society: '사회',
  disaster: '재난',
  international: '국제',
  technology: '기술',
};

/** 효과 필드의 표시 이름. 값이 오르면 국가에 유리한지도 함께 둔다. */
const FIELD_META: Partial<Record<ModifierField, { label: string; upIsGood: boolean }>> = {
  gdpGrowth: { label: '성장', upIsGood: true },
  inflation: { label: '물가', upIsGood: false },
  unemployment: { label: '실업', upIsGood: false },
  consumption: { label: '소비', upIsGood: true },
  investment: { label: '투자', upIsGood: true },
  exports: { label: '수출', upIsGood: true },
  imports: { label: '수입', upIsGood: false },
  productivity: { label: '생산성', upIsGood: true },
  competitiveness: { label: '경쟁력', upIsGood: true },
  approval: { label: '지지율', upIsGood: true },
  stability: { label: '안정성', upIsGood: true },
  fertility: { label: '출산율', upIsGood: true },
  migration: { label: '이민', upIsGood: true },
  debt: { label: '부채', upIsGood: false },
  revenue: { label: '세입', upIsGood: true },
  spending: { label: '재정지출', upIsGood: false },
  militaryReadiness: { label: '군 준비도', upIsGood: true },
  energyCost: { label: '에너지 가격', upIsGood: false },
};

interface Impact {
  label: string;
  direction: 'up' | 'down';
  good: boolean;
}

/**
 * 효과 목록을 방향 표시로 바꾼다.
 * 크기는 보여주지 않는다. 실제 반영은 시뮬레이션 엔진이 하고, UI 는 부호만 읽는다.
 */
function impactsOf(modifiers: readonly Modifier[]): Impact[] {
  const merged = new Map<ModifierField, number>();
  for (const modifier of modifiers) {
    merged.set(modifier.field, (merged.get(modifier.field) ?? 0) + modifier.value);
  }

  const out: Impact[] = [];
  for (const [field, value] of merged) {
    const meta = FIELD_META[field];
    if (!meta || value === 0) continue;
    const up = value > 0;
    out.push({ label: meta.label, direction: up ? 'up' : 'down', good: up === meta.upIsGood });
  }
  return out.slice(0, 5);
}

function ImpactRow({ impacts }: { impacts: Impact[] }) {
  if (impacts.length === 0) return null;
  return (
    <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      {impacts.map((impact) => (
        <span key={impact.label} className="flex items-center gap-1 text-[12px]">
          <span style={{ color: impact.good ? 'var(--color-positive)' : 'var(--color-negative)' }}>
            {impact.direction === 'up' ? '▲' : '▼'}
          </span>
          <span className="text-[var(--color-ink-muted)]">{impact.label}</span>
        </span>
      ))}
    </span>
  );
}

/** 선택지가 있는 이벤트는 결정을 내려야 다음 분기로 넘어갈 수 있다. */
export function EventModal() {
  const pending = useGameStore((store) => store.game?.pendingEvent ?? null);
  const choose = useGameStore((store) => store.chooseEventOption);

  if (!pending) return null;
  const event = findEvent(pending.eventId);
  if (!event || !event.choices) return null;

  return (
    <Modal
      open
      title={event.title}
      subtitle={`${CATEGORY_LABEL[event.category]} 현안`}
      tone="command"
    >
      <p className="text-[14px] leading-relaxed text-[var(--color-ink-muted)] md:text-[13px]">
        {event.description}
      </p>

      <h3 className="rule-before mt-5 text-[12px] font-semibold text-[var(--color-ink-muted)]">
        결정
      </h3>

      <div className="mt-2 flex flex-col gap-2.5">
        {event.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => choose(choice.id)}
            className="min-h-[56px] rounded-lg border px-3.5 py-3 text-left transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] md:px-4"
          >
            <span className="block text-[14px] font-semibold md:text-[13px]">{choice.label}</span>
            <span className="mt-1 block text-[13px] leading-relaxed text-[var(--color-ink-muted)] md:text-[12px]">
              {choice.description}
            </span>
            <ImpactRow impacts={impactsOf(choice.modifiers)} />
            <span className="mt-1.5 block text-[12px] leading-relaxed text-[var(--color-ink-faint)]">
              {choice.outlook.join(' · ')}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
        방향만 표시됩니다. 실제 변화 폭은 다음 분기 시뮬레이션에서 결정됩니다.
      </p>
    </Modal>
  );
}

export function GameOverModal() {
  const gameOver = useGameStore((store) => store.game?.gameOver ?? null);
  const resetGame = useGameStore((store) => store.resetGame);
  const turn = useGameStore((store) => store.game?.turn ?? 0);

  if (!gameOver) return null;

  return (
    <Modal
      open
      title="임기 종료"
      subtitle={`집권 ${Math.floor(turn / 4)}년 ${turn % 4}분기 만에 정권이 끝났습니다`}
      tone="command"
    >
      <p className="text-[14px] leading-relaxed md:text-[13px]">{gameOver.reason}</p>
      <div className="mt-5 flex justify-end">
        <Button variant="primary" onClick={resetGame}>
          새 게임 시작
        </Button>
      </div>
    </Modal>
  );
}
