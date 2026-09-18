import type { Screen } from '@/store/gameStore';

/**
 * 하단 내비게이션용 단색 아이콘.
 * 라벨과 함께 쓰이므로 형태만 구분되면 충분하다. 외부 아이콘 의존성을 두지 않는다.
 */
const PATHS: Record<Screen | 'more', string> = {
  overview: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5',
  economy: 'M3 17.5 9 11l4 3.5L21 6M21 6h-5M21 6v5',
  budget: 'M3 20V9m5.5 11V4m5.5 16v-8m5.5 8V7',
  tax: 'M7 3h10v18l-5-3-5 3V3ZM9.5 8h5M9.5 12h5',
  population:
    'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 20v-1.5A4.5 4.5 0 0 1 7.5 14h3A4.5 4.5 0 0 1 15 18.5V20m2-6h.5a3.5 3.5 0 0 1 3.5 3.5V20',
  diplomacy:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-18c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3ZM3.4 9h17.2M3.4 15h17.2',
  military: 'M12 3l7.5 3v5.5c0 4.4-3 8-7.5 9.5-4.5-1.5-7.5-5.1-7.5-9.5V6L12 3Z',
  statistics: 'M4 20h16M7 20v-6.5M12 20V7m5 13v-9.5',
  news: 'M4 5h13v14H4V5Zm13 4h3v8a2 2 0 0 1-2 2M7 9h7M7 12.5h7M7 16h4',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
};

export function NavIcon({ screen, size = 20 }: { screen: Screen | 'more'; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[screen]} />
    </svg>
  );
}
