/** 게임에 등장하는 8개국의 식별자. 저장 데이터의 키로도 쓰이므로 값을 바꾸면 마이그레이션이 필요하다. */
export type CountryId = 'KOR' | 'USA' | 'JPN' | 'CHN' | 'DEU' | 'FRA' | 'GBR' | 'IND';

export const COUNTRY_IDS = ['KOR', 'USA', 'JPN', 'CHN', 'DEU', 'FRA', 'GBR', 'IND'] as const;

/** AI 국가의 의사결정 성향. 플레이어 국가에도 값이 존재하지만 사용되지 않는다. */
export type Personality = 'aggressive' | 'neutral' | 'economic' | 'diplomatic' | 'isolationist';

export interface CountryProfile {
  id: CountryId;
  name: string;
  /** 국제 뉴스에서 쓰는 짧은 표기. */
  shortName: string;
  personality: Personality;
  /** 지역 블록. 외교 초기 관계와 무역 가중치에 쓰인다. */
  bloc: 'asia' | 'americas' | 'europe';
}
