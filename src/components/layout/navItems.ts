import type { Screen } from '@/store/gameStore';

export interface NavItem {
  key: Screen;
  /** 사이드바용 전체 이름. */
  label: string;
  /** 하단 내비게이션용 짧은 이름. */
  short: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'overview', label: '국가 개요', short: '개요' },
  { key: 'economy', label: '경제', short: '경제' },
  { key: 'budget', label: '예산', short: '예산' },
  { key: 'tax', label: '세금', short: '세금' },
  { key: 'population', label: '인구', short: '인구' },
  { key: 'diplomacy', label: '외교', short: '외교' },
  { key: 'military', label: '군사', short: '군사' },
  { key: 'statistics', label: '통계', short: '통계' },
  { key: 'news', label: '뉴스', short: '뉴스' },
];

/** 모바일 하단 내비게이션에 직접 노출하는 화면. */
export const PRIMARY_SCREENS: Screen[] = ['overview', 'economy', 'budget', 'diplomacy'];

/** '더보기' 시트로 들어가는 화면. */
export const SECONDARY_SCREENS: Screen[] = ['tax', 'population', 'military', 'statistics', 'news'];

export function navItem(key: Screen): NavItem {
  return NAV_ITEMS.find((item) => item.key === key) ?? NAV_ITEMS[0]!;
}
