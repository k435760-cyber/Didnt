import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config';

let client: SupabaseClient | null = null;

/** 클라이언트는 실제로 필요해질 때 한 번만 만든다. (첫 페인트를 늦추지 않으려고) */
export function supabase(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: 'scorelab.auth',
    },
  });
  return client;
}

export interface Account {
  id: string;
  email: string | null;
  name: string;
  avatar: string | null;
  provider: string;
}

export function toAccount(user: User): Account {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = meta[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
  };
  return {
    id: user.id,
    email: user.email ?? null,
    name: pick('full_name', 'name', 'user_name') ?? user.email?.split('@')[0] ?? '사용자',
    avatar: pick('avatar_url', 'picture'),
    provider: (user.app_metadata?.provider as string | undefined) ?? 'unknown',
  };
}

/** 로그인 후 돌아올 주소. 해시·쿼리를 떼어 OAuth 리다이렉트 허용 목록과 맞춘다. */
export function redirectTarget(): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}`;
}

export class AuthFailure extends Error {
  readonly code: string;
  constructor(message: string, code = 'unknown') {
    super(message);
    this.name = 'AuthFailure';
    this.code = code;
  }
}

/** Supabase 의 영어 오류를 사용자가 읽을 한국어로 바꾼다. */
export function describeAuthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const lower = raw.toLowerCase();
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) {
    return 'Google 로그인이 아직 프로젝트에서 켜져 있지 않아요. Supabase 대시보드에서 Google 공급자를 활성화해 주세요.';
  }
  if (lower.includes('redirect') || lower.includes('not allowed')) {
    return '이 주소가 허용된 리다이렉트 목록에 없어요. Supabase 인증 설정에 현재 주소를 추가해 주세요.';
  }
  if (lower.includes('popup') || lower.includes('blocked'))
    return '브라우저가 로그인 창을 막았어요. 팝업 차단을 해제하고 다시 시도해 주세요.';
  if (lower.includes('network') || lower.includes('fetch'))
    return '네트워크에 연결하지 못했어요. 인터넷 상태를 확인해 주세요.';
  if (lower.includes('session') && lower.includes('missing'))
    return '로그인 정보가 만료됐어요. 다시 로그인해 주세요.';
  return raw || '알 수 없는 오류가 발생했어요.';
}
