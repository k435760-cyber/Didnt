/**
 * Supabase 연결 정보.
 *
 * publishable key 는 브라우저에 노출되는 것을 전제로 발급된 공개 키이며,
 * 실제 권한은 Supabase 의 Row Level Security 정책이 통제한다.
 * 환경변수가 주어지면 그 값을 우선 사용하고, 없으면 아래 기본값으로 동작한다.
 * (단일 index.html 번들에서도 별도 설정 없이 로그인이 되도록 하기 위함)
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://dbneonomwrqwlbitwdtr.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_Smg0o4U5qYTkrLygwhVUSA_YM7HwKjM';
