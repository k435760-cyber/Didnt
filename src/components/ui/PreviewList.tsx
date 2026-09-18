import type { PolicyPreview } from '@/simulation/government/preview';

const ARROW = { up: '▲', down: '▼', flat: '–' } as const;
const WEIGHT = { small: '소폭', medium: '뚜렷', large: '큰 폭' } as const;

/**
 * 정책 변경의 예상 효과.
 * 확정 계산이 가능한 값만 숫자로 보여주고, 나머지는 방향과 크기만 제시한다.
 */
export function PreviewList({ preview }: { preview: PolicyPreview }) {
  if (preview.certain.length === 0 && preview.entries.length === 0) return null;

  const grouped = new Map<string, typeof preview.entries>();
  for (const entry of preview.entries) {
    const list = grouped.get(entry.horizon) ?? [];
    list.push(entry);
    grouped.set(entry.horizon, list);
  }

  return (
    <div className="rounded-md border bg-[var(--color-surface-muted)] px-3 py-2.5 text-[12px] md:text-[11px]">
      {preview.certain.map((item) => (
        <div key={item.label} className="flex flex-wrap items-baseline gap-x-2 pb-1.5">
          <span className="text-[var(--color-ink-faint)]">{item.label}</span>
          <span className="tnum font-medium">{item.value}</span>
        </div>
      ))}

      {[...grouped.entries()].map(([horizon, entries]) => (
        <div key={horizon} className="flex items-baseline gap-2 py-0.5">
          <span className="w-8 shrink-0 text-[var(--color-ink-faint)]">{horizon}</span>
          <span className="flex min-w-0 flex-wrap gap-x-3 gap-y-0.5">
            {entries.map((entry) => (
              <span key={`${horizon}-${entry.label}`} className="flex items-center gap-1">
                <span
                  style={{
                    color:
                      entry.direction === 'up'
                        ? 'var(--color-positive)'
                        : entry.direction === 'down'
                          ? 'var(--color-negative)'
                          : 'var(--color-ink-faint)',
                  }}
                >
                  {ARROW[entry.direction]}
                </span>
                <span className="text-[var(--color-ink-muted)]">{entry.label}</span>
                <span className="text-[var(--color-ink-faint)]">{WEIGHT[entry.magnitude]}</span>
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
