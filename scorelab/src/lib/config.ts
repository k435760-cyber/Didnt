/**
 * 배포 설정.
 *
 * publishable key 는 브라우저에 그대로 나가는 공개 키다. 모든 접근 통제는
 * Postgres 의 RLS 정책(`auth.uid() = user_id`)이 하고, 이 키만으로는
 * 다른 사람의 행을 읽을 수도 쓸 수도 없다. 비밀 키(service_role)는 여기에 절대 두지 않는다.
 * 값은 빌드 시 VITE_ 환경 변수로 덮어쓸 수 있다.
 */
const env = import.meta.env as Record<string, string | undefined>;

export const SUPABASE_URL = env.VITE_SUPABASE_URL ?? 'https://dbneonomwrqwlbitwdtr.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_Smg0o4U5qYTkrLygwhVUSA_YM7HwKjM';

export const APP = {
  name: 'ScoreLab',
  korean: '스코어랩',
  tagline: '내신 점수, 정확하게 계산하고 목표까지의 거리를 봅니다',
  version: '1.0.0',
} as const;

export const isSupabaseConfigured = () =>
  SUPABASE_URL.startsWith('https://') && SUPABASE_PUBLISHABLE_KEY.length > 20;
