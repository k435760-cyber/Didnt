/**
 * 클라우드 동기화 연결. 로그인 상태와 워크스페이스 사이에 앉아 있다.
 *
 * 로그인하면 한 번 맞추고, 이후에는 편집이 멈춘 뒤 잠깐 기다렸다가 다시 맞춘다.
 * 동기화 결과가 지금과 같으면 상태를 갈아끼우지 않는다 (렌더 루프 방지).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { serialize } from '../lib/serialize';
import {
  fetchPrefs,
  syncWorkspace,
  upsertProfile,
  wipeCloud,
  type SyncReport,
} from '../lib/sync';
import { useAuth } from './auth';
import { sanitizeSettings, useSettings } from './settings';
import { useWorkspace } from './workspace';

export type CloudStatus = 'off' | 'idle' | 'syncing' | 'error';

interface CloudApi {
  status: CloudStatus;
  lastReport: SyncReport | null;
  lastError: string | null;
  sync: (options?: { silent?: boolean }) => Promise<SyncReport | null>;
  wipe: () => Promise<void>;
}

const CloudContext = createContext<CloudApi | null>(null);

export function useCloud(): CloudApi {
  const api = useContext(CloudContext);
  if (!api) throw new Error('useCloud 는 CloudProvider 안에서만 쓸 수 있습니다.');
  return api;
}

const AUTO_SYNC_DELAY = 4000;

export function CloudProvider({ children }: { children: ReactNode }) {
  const { account, status: authStatus } = useAuth();
  const { settings, merge } = useSettings();
  const { workspace, replaceWorkspace } = useWorkspace();

  const [status, setStatus] = useState<CloudStatus>('off');
  const [lastReport, setLastReport] = useState<SyncReport | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // 렌더마다 바뀌는 값을 effect 의존성에서 빼기 위해 ref 로 들고 있는다.
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const running = useRef(false);
  const lastPushed = useRef<string>('');
  // 서버 설정을 내려받기 전에 이 기기 설정을 올려 덮어쓰지 않도록 하는 빗장.
  const prefsReady = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const sync = useCallback(
    async ({ silent = false } = {}) => {
      if (!account) return null;
      if (running.current) return null;
      running.current = true;
      if (!silent) setStatus('syncing');
      try {
        const { workspace: merged, report } = await syncWorkspace(account.id, workspaceRef.current);
        const before = serialize({ ...workspaceRef.current, updatedAt: '' });
        const after = serialize({ ...merged, updatedAt: '' });
        if (before !== after) replaceWorkspace(merged);
        lastPushed.current = after;
        setLastReport(report);
        setLastError(null);
        setStatus('idle');
        return report;
      } catch (error) {
        const message = error instanceof Error ? error.message : '동기화에 실패했습니다.';
        setLastError(message);
        setStatus('error');
        return null;
      } finally {
        running.current = false;
      }
    },
    [account, replaceWorkspace],
  );

  // 로그인/로그아웃 전환
  useEffect(() => {
    if (authStatus !== 'signed-in' || !account) {
      setStatus('off');
      setLastReport(null);
      lastPushed.current = '';
      prefsReady.current = false;
      return;
    }
    setStatus('idle');
    let cancelled = false;
    void (async () => {
      await upsertProfile(account.id, { display_name: account.name, avatar_url: account.avatar });
      // 표시 설정도 계정에 딸려 다닌다. 서버 값이 있으면 먼저 받아 적용하고,
      // 아직 없으면(첫 로그인) 이 기기의 설정을 올려 다음 기기가 이어받게 한다.
      const remote = sanitizeSettings(await fetchPrefs(account.id));
      if (cancelled) return;
      if (Object.keys(remote).length) {
        merge(remote);
      } else {
        await upsertProfile(account.id, {
          display_name: account.name,
          avatar_url: account.avatar,
          prefs: settingsRef.current,
        });
      }
      prefsReady.current = true;
    })();
    if (settings.autoSync) void sync();
    return () => {
      cancelled = true;
    };
    // account.id 가 바뀔 때만 다시 맞춘다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, account?.id]);

  // 설정이 바뀌면 계정에 올린다. (다른 기기에서 열어도 같은 테마·표시 설정이 된다)
  useEffect(() => {
    if (!account || !prefsReady.current) return;
    const timer = setTimeout(() => {
      void upsertProfile(account.id, {
        display_name: account.name,
        avatar_url: account.avatar,
        prefs: settings,
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [settings, account]);

  // 편집이 멈추면 조용히 다시 올린다.
  useEffect(() => {
    if (!account || !settings.autoSync || status === 'off') return;
    const snapshot = serialize({ ...workspace, updatedAt: '' });
    if (snapshot === lastPushed.current) return;
    const timer = setTimeout(() => void sync({ silent: true }), AUTO_SYNC_DELAY);
    return () => clearTimeout(timer);
  }, [workspace, account, settings.autoSync, status, sync]);

  const api = useMemo<CloudApi>(
    () => ({
      status,
      lastReport,
      lastError,
      sync,
      wipe: async () => {
        if (!account) return;
        await wipeCloud(account.id);
        lastPushed.current = '';
        setLastReport(null);
      },
    }),
    [status, lastReport, lastError, sync, account],
  );

  return <CloudContext.Provider value={api}>{children}</CloudContext.Provider>;
}
