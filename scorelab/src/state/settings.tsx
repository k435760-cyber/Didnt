/**
 * 표시 설정. 테마와 배경 그라데이션은 <html> 의 data 속성 하나로 제어하고,
 * CSS 가 나머지를 한다. (자바스크립트가 색을 계산하지 않는다.)
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { KEYS, loadJson, saveJson } from '../lib/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemeMode;
  /** 은은한 배경 그라데이션 */
  gradient: boolean;
  /** 계산 과정을 기본으로 펼쳐 보여줄지 */
  showSteps: boolean;
  /** 로그인 시 자동으로 클라우드와 맞출지 */
  autoSync: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  gradient: true,
  showSteps: true,
  autoSync: true,
};

const THEMES: ThemeMode[] = ['system', 'light', 'dark'];

/**
 * 서버(sl_profiles.prefs)에서 내려온 설정을 믿지 않고 걸러 낸다.
 * 모르는 키는 버리고, 타입이 맞는 값만 남긴다.
 */
export function sanitizeSettings(raw: unknown): Partial<Settings> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const source = raw as Record<string, unknown>;
  const out: Partial<Settings> = {};
  if (THEMES.includes(source.theme as ThemeMode)) out.theme = source.theme as ThemeMode;
  for (const key of ['gradient', 'showSteps', 'autoSync'] as const) {
    if (typeof source[key] === 'boolean') out[key] = source[key];
  }
  return out;
}

interface SettingsApi {
  settings: Settings;
  resolvedTheme: 'light' | 'dark';
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  merge: (patch: Partial<Settings>) => void;
  toggle: (key: 'gradient' | 'showSteps' | 'autoSync') => void;
}

const SettingsContext = createContext<SettingsApi | null>(null);

export function useSettings(): SettingsApi {
  const api = useContext(SettingsContext);
  if (!api) throw new Error('useSettings 는 SettingsProvider 안에서만 쓸 수 있습니다.');
  return api;
}

const prefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() =>
    loadJson(KEYS.settings, DEFAULT_SETTINGS),
  );
  const [systemDark, setSystemDark] = useState(prefersDark);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme: 'light' | 'dark' =
    settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.gradient = settings.gradient ? 'on' : 'off';
    // 주소창 색도 같이 맞춘다. PWA 로 설치했을 때 상단 영역이 어긋나지 않게.
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = resolvedTheme === 'dark' ? '#0a0c13' : '#f6f7fb';
  }, [resolvedTheme, settings.gradient]);

  useEffect(() => {
    saveJson(KEYS.settings, settings);
  }, [settings]);

  const api = useMemo<SettingsApi>(
    () => ({
      settings,
      resolvedTheme,
      set: (key, value) => setSettings((current) => ({ ...current, [key]: value })),
      merge: (patch) => setSettings((current) => ({ ...current, ...patch })),
      toggle: (key) => setSettings((current) => ({ ...current, [key]: !current[key] })),
    }),
    [settings, resolvedTheme],
  );

  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>;
}

/** 배경. 그라데이션을 꺼도 아주 옅은 명암은 남아 화면이 납작해 보이지 않는다. */
export function Ambient() {
  const { settings } = useSettings();
  return (
    <div className="ambient" aria-hidden="true">
      <div className="ambient__base" />
      <div className="ambient__layer ambient__layer--tint">
        <div className="ambient__blob ambient__blob--1" />
        <div className="ambient__blob ambient__blob--2" />
        <div className="ambient__blob ambient__blob--3" />
        {settings.gradient && <div className="ambient__grain" />}
      </div>
    </div>
  );
}
