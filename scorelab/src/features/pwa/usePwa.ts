/**
 * PWA 설치와 서비스 워커.
 *
 * 브라우저 기본 설치 배너에 기대지 않고 beforeinstallprompt 를 붙잡아 두었다가
 * 우리 모달에서 사용자가 "설치" 를 눌렀을 때 띄운다. iOS 처럼 그 이벤트가 없는
 * 곳은 직접 안내한다.
 */
import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Platform = 'ios' | 'android' | 'desktop';

export interface PwaState {
  /** 설치 프롬프트를 지금 띄울 수 있는가 */
  canPrompt: boolean;
  /** 이미 설치되어 독립 창으로 실행 중인가 */
  installed: boolean;
  platform: Platform;
  /** 새 버전이 받아져 있어 새로고침하면 적용되는 상태 */
  updateReady: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  applyUpdate: () => void;
}

const detectPlatform = (): Platform => {
  const ua = navigator.userAgent;
  if (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  ) {
    return 'ios';
  }
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
};

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function usePwa(): PwaState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [updateReady, setUpdateReady] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [platform] = useState(detectPlatform);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    const media = window.matchMedia('(display-mode: standalone)');
    const onDisplayChange = () => setInstalled(isStandalone());
    media.addEventListener('change', onDisplayChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      media.removeEventListener('change', onDisplayChange);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
    let cancelled = false;

    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then((registration) => {
        if (cancelled) return;
        if (registration.waiting) {
          setWaiting(registration.waiting);
          setUpdateReady(true);
        }
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            // 이미 한 번 제어당한 적 있는 페이지에서만 "업데이트" 다. 첫 설치는 조용히 지나간다.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setWaiting(installing);
              setUpdateReady(true);
            }
          });
        });
      })
      .catch(() => {
        /* 서비스 워커가 막힌 환경에서도 앱은 그대로 동작한다 */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return 'unavailable' as const;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferred(null);
    return outcome;
  }, [deferred]);

  const applyUpdate = useCallback(() => {
    waiting?.postMessage({ type: 'SKIP_WAITING' });
    // 새 워커가 제어를 가져가면 한 번만 새로고침한다.
    let reloaded = false;
    navigator.serviceWorker?.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }, [waiting]);

  return {
    canPrompt: deferred !== null,
    installed,
    platform,
    updateReady,
    promptInstall,
    applyUpdate,
  };
}
