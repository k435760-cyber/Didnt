'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { findEvent } from '@/simulation/events/catalog';
import type { EventCategory } from '@/types';
import { useGameStore } from '@/store/gameStore';

const CATEGORY_LABEL: Record<EventCategory, string> = {
  economy: '경제',
  society: '사회',
  disaster: '재난',
  international: '국제',
  technology: '기술',
};

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
      subtitle={`${CATEGORY_LABEL[event.category]} · 결정이 필요합니다`}
    >
      <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
        {event.description}
      </p>

      <div className="mt-5 flex flex-col gap-2.5">
        {event.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => choose(choice.id)}
            className="rounded-lg border px-4 py-3.5 text-left transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
          >
            <span className="block text-[13px] font-semibold">{choice.label}</span>
            <span className="mt-1 block text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
              {choice.description}
            </span>
            <span className="mt-2 flex flex-wrap gap-1.5">
              {choice.outlook.map((item) => (
                <Badge key={item} tone="neutral">
                  {item}
                </Badge>
              ))}
            </span>
          </button>
        ))}
      </div>
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
      subtitle={`${Math.floor(turn / 4)}년 ${turn % 4}분기 만에 정권이 끝났습니다`}
    >
      <p className="text-[13px] leading-relaxed">{gameOver.reason}</p>
      <div className="mt-5 flex justify-end">
        <Button variant="primary" onClick={resetGame}>
          새 게임 시작
        </Button>
      </div>
    </Modal>
  );
}
