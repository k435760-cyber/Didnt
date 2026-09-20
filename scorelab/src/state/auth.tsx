/**
 * 인증. Google OAuth 한 가지만 제공하고, 로그인하지 않아도 앱의 모든 계산 기능은
 * 그대로 쓸 수 있다. (로그인은 "기기 간 동기화" 를 켜는 스위치에 가깝다.)
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { isSupabaseConfigured } from '../lib/config';
import {
  describeAuthError,
  redirectTarget,
  supabase,
  toAccount,
  type Account,
} from '../lib/supabase';

const NOT_CONFIGURED =
  '이 빌드에는 백엔드 주소가 들어 있지 않아 로그인과 동기화를 쓸 수 없어요. 계산 기능은 그대로 쓸 수 있습니다.';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

interface AuthApi {
  status: AuthStatus;
  /** 이 빌드가 백엔드를 가지고 있어서 로그인을 제안해도 되는가 */
  configured: boolean;
  account: Account | null;
  /** 마지막 인증 오류 (한국어) */
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthApi | null>(null);

export function useAuth(): AuthApi {
  const api = useContext(AuthContext);
  if (!api) throw new Error('useAuth 는 AuthProvider 안에서만 쓸 수 있습니다.');
  return api;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    // 백엔드 주소가 없는 빌드에서는 클라이언트를 만들지 않는다. (만들면 곧바로 던진다)
    if (!isSupabaseConfigured()) {
      setStatus('signed-out');
      return;
    }
    const client = supabase();

    client.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted.current) return;
        const user = data.session?.user ?? null;
        setAccount(user ? toAccount(user) : null);
        setStatus(user ? 'signed-in' : 'signed-out');
      })
      .catch(() => {
        if (!mounted.current) return;
        setStatus('signed-out');
      });

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (!mounted.current) return;
      const user = session?.user ?? null;
      setAccount(user ? toAccount(user) : null);
      setStatus(user ? 'signed-in' : 'signed-out');
    });

    // OAuth 리다이렉트로 돌아오면 주소에 코드가 남는다. 주소창을 깨끗하게 정리한다.
    if (window.location.search.includes('code=') || window.location.hash.includes('access_token')) {
      const clean = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState({}, '', clean);
    }

    return () => {
      mounted.current = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const api = useMemo<AuthApi>(
    () => ({
      status,
      configured: isSupabaseConfigured(),
      account,
      error,
      clearError: () => setError(null),
      signInWithGoogle: async () => {
        setError(null);
        if (!isSupabaseConfigured()) {
          setError(NOT_CONFIGURED);
          throw new Error(NOT_CONFIGURED);
        }
        try {
          const { error: authError } = await supabase().auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: redirectTarget(),
              queryParams: { prompt: 'select_account' },
            },
          });
          if (authError) throw authError;
        } catch (cause) {
          const message = describeAuthError(cause);
          setError(message);
          throw new Error(message);
        }
      },
      signOut: async () => {
        try {
          if (isSupabaseConfigured()) await supabase().auth.signOut();
        } finally {
          if (mounted.current) {
            setAccount(null);
            setStatus('signed-out');
          }
        }
      },
    }),
    [status, account, error],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}
