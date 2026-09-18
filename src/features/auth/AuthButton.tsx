'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  getCurrentUser,
  signInWithGoogle,
  signOut,
  subscribeAuth,
  type AuthUser,
} from '@/lib/supabase/auth';
import { useGameStore } from '@/store/gameStore';

/**
 * Google 로그인.
 * 로그인하면 저장 슬롯이 계정별 네임스페이스로 분리되어, 같은 브라우저에서
 * 여러 사람이 각자의 진행 상황을 유지할 수 있다.
 */
export function AuthButton({ size = 'md' }: { size?: 'sm' | 'md' } = {}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setNamespace = useGameStore((store) => store.setNamespace);

  useEffect(() => {
    let cancelled = false;

    getCurrentUser().then((current) => {
      if (cancelled) return;
      setUser(current);
      setNamespace(current ? current.id : 'local');
    });

    const unsubscribe = subscribeAuth((next) => {
      setUser(next);
      setNamespace(next ? next.id : 'local');
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [setNamespace]);

  const handleSignIn = async () => {
    setPending(true);
    setError(null);
    const message = await signInWithGoogle();
    if (message) {
      setError(message);
      setPending(false);
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden text-[11px] text-[var(--color-ink-muted)] sm:inline">
          {user.name}
        </span>
        <Button size={size} variant="ghost" onClick={() => void signOut()}>
          로그아웃
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-[11px] text-[var(--color-negative)]">{error}</span>}
      <Button
        size={size}
        variant="secondary"
        onClick={() => void handleSignIn()}
        disabled={pending}
      >
        <GoogleMark />
        {pending ? '연결 중…' : 'Google 로그인'}
      </Button>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width={13} height={13} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2 5.1-4.4 6.7v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.2Z"
      />
      <path
        fill="#34A853"
        d="M24 46c6 0 11-2 14.6-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.7C7.9 41.1 15.4 46 24 46Z"
      />
      <path
        fill="#FBBC05"
        d="M11.6 28.2c-.4-1.3-.7-2.7-.7-4.2s.3-2.9.7-4.2v-5.7H4.3A22 22 0 0 0 2 24c0 3.6.9 6.9 2.3 9.9l7.3-5.7Z"
      />
      <path
        fill="#EA4335"
        d="M24 10.6c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4 30 2 24 2 15.4 2 7.9 6.9 4.3 14.1l7.3 5.7c1.7-5.2 6.6-9.2 12.4-9.2Z"
      />
    </svg>
  );
}
