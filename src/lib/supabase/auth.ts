'use client';

import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from './client';

export interface AuthUser {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
}

function toAuthUser(user: User): AuthUser {
  const metadata = user.user_metadata ?? {};
  const name =
    (typeof metadata.full_name === 'string' && metadata.full_name) ||
    (typeof metadata.name === 'string' && metadata.name) ||
    user.email?.split('@')[0] ||
    '플레이어';

  return {
    id: user.id,
    email: user.email ?? null,
    name,
    avatarUrl: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null,
  };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  return toAuthUser(data.session.user);
}

/** Google OAuth 로그인. 로그인 후 현재 페이지로 돌아온다. */
export async function signInWithGoogle(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return '로그인을 사용할 수 없는 환경입니다.';

  const redirectTo =
    typeof window === 'undefined' ? undefined : window.location.origin + window.location.pathname;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { prompt: 'select_account' },
    },
  });

  return error ? error.message : null;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** 세션 변화 구독. 반환된 함수로 해제한다. */
export function subscribeAuth(onChange: (user: AuthUser | null) => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => undefined;

  const { data } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
    onChange(session ? toAuthUser(session.user) : null);
  });

  return () => data.subscription.unsubscribe();
}
