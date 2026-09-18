/**
 * 단일 파일 번들에 주입되는 Supabase 접속 정보.
 * publishable key 는 브라우저 노출을 전제로 발급된 공개 키이며,
 * 권한은 Supabase 의 RLS 정책이 통제한다.
 * src/lib/supabase/config.ts 의 기본값과 동일한 값을 유지한다.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://dbneonomwrqwlbitwdtr.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_Smg0o4U5qYTkrLygwhVUSA_YM7HwKjM';
