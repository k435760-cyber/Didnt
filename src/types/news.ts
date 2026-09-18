export type NewsTone = 'good' | 'bad' | 'neutral';

export type NewsSection = 'economy' | 'society' | 'politics' | 'world' | 'defense';

export interface NewsItem {
  id: string;
  turn: number;
  headline: string;
  body: string;
  tone: NewsTone;
  section: NewsSection;
}
