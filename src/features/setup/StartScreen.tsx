'use client';

import { useMemo, useState } from 'react';
import { COUNTRIES } from '@/config/countries';
import { PERSONALITY_LABELS } from '@/config/diplomacy';
import { COUNTRY_IDS } from '@/types/country';
import type { CountryId } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Flag } from '@/components/Flag';
import { formatMoney, formatPercent, formatPopulation, formatDateTime } from '@/lib/format';
import { useGameStore } from '@/store/gameStore';
import { AuthButton } from '@/features/auth/AuthButton';

/** 국가별 한 줄 성격 설명. 선택 화면에서 전략 방향을 바로 잡을 수 있게 한다. */
const BRIEFS: Record<CountryId, string> = {
  KOR: '고성장 수출국이지만 세계 최저 수준의 출산율과 높은 에너지 의존도를 안고 있다.',
  USA: '압도적 규모와 군사력. 대신 만성 재정적자와 높은 국가부채가 발목을 잡는다.',
  JPN: 'GDP 대비 250%의 국가부채와 29%의 고령인구. 재정과 인구를 동시에 다뤄야 한다.',
  CHN: '거대한 내수와 투자 주도 성장. 급격한 고령화와 낮은 소비 비중이 약점이다.',
  DEU: '강한 제조업과 건전한 재정. 높은 세율과 에너지 의존이 성장을 누른다.',
  FRA: 'GDP의 40%를 쓰는 복지국가. 높은 실업률과 재정적자를 어떻게 다룰지가 핵심이다.',
  GBR: '금융 중심 서비스 경제. 낮은 투자율과 정체된 생산성이 과제다.',
  IND: '가장 빠른 잠재성장률과 젊은 인구. 낮은 생산성·교육 수준과 높은 물가가 과제다.',
};

export function StartScreen() {
  const [selected, setSelected] = useState<CountryId>('KOR');
  const [seed, setSeed] = useState('');
  const startGame = useGameStore((store) => store.startGame);
  const loadGame = useGameStore((store) => store.loadGame);
  const saveMeta = useGameStore((store) => store.saveMeta);

  const data = COUNTRIES[selected];
  const perCapita = useMemo(
    () => (data.gdp * 1_000_000_000) / data.population,
    [data.gdp, data.population],
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">국가 운영 시뮬레이터</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
            1턴은 1분기입니다. 세율과 예산을 정하고, 경제·인구·외교가 서로 어떻게 반응하는지
            확인하며 임기를 이어가세요. 같은 시드에서는 항상 같은 일이 벌어집니다.
          </p>
        </div>
        <AuthButton />
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-[var(--color-ink-muted)]">
            국가 선택
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {COUNTRY_IDS.map((id) => {
              const country = COUNTRIES[id];
              const active = id === selected;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelected(id)}
                  className="flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors"
                  style={{
                    borderColor: active ? 'var(--color-accent)' : 'var(--color-line)',
                    backgroundColor: active ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                  }}
                >
                  <Flag country={id} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{country.name}</span>
                    <span className="tnum block text-[11px] text-[var(--color-ink-faint)]">
                      GDP {formatMoney(country.gdp)} · 인구 {formatPopulation(country.population)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-lg border bg-[var(--color-surface)] p-4">
            <div className="flex items-center gap-2.5">
              <Flag country={selected} size={32} />
              <div>
                <h3 className="text-sm font-semibold">{data.name}</h3>
                <Badge tone="accent">{PERSONALITY_LABELS[data.personality]}</Badge>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--color-ink-muted)]">
              {BRIEFS[selected]}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
              <Fact
                label="1인당 GDP"
                value={`${Math.round(perCapita).toLocaleString('ko-KR')} USD`}
              />
              <Fact label="추세 성장률" value={formatPercent(data.trendGrowth)} />
              <Fact label="물가" value={formatPercent(data.inflation)} />
              <Fact label="실업률" value={formatPercent(data.unemployment)} />
              <Fact label="국가부채" value={`GDP 대비 ${data.debtToGdp}%`} />
              <Fact label="합계출산율" value={data.fertilityRate.toFixed(2)} />
              <Fact label="교육 수준" value={`${data.educationIndex}/100`} />
              <Fact label="에너지 의존도" value={`${data.energyDependence}/100`} />
            </dl>
          </div>

          <div className="rounded-lg border bg-[var(--color-surface)] p-4">
            <label
              htmlFor="seed"
              className="block text-[11px] font-medium text-[var(--color-ink-muted)]"
            >
              시드 (선택)
            </label>
            <input
              id="seed"
              value={seed}
              onChange={(event) => setSeed(event.target.value.slice(0, 32))}
              placeholder="비워두면 무작위로 생성됩니다"
              className="mt-1.5 w-full rounded-md border bg-[var(--color-surface)] px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--color-accent)]"
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
              같은 시드 + 같은 선택 = 같은 결과. 전략을 비교할 때 쓰세요.
            </p>
            <Button
              variant="primary"
              className="mt-3 w-full"
              onClick={() => startGame(selected, seed)}
            >
              {data.name}(으)로 시작
            </Button>
          </div>

          {(saveMeta.manual || saveMeta.auto) && (
            <div className="rounded-lg border bg-[var(--color-surface)] p-4">
              <h3 className="text-[11px] font-semibold text-[var(--color-ink-muted)]">이어하기</h3>
              <div className="mt-2 flex flex-col gap-2">
                {saveMeta.manual && (
                  <SaveRow
                    label="저장 파일"
                    meta={`${saveMeta.manual.country} · ${saveMeta.manual.turn}분기`}
                    time={saveMeta.manual.savedAt}
                    onClick={() => loadGame('manual')}
                  />
                )}
                {saveMeta.auto && (
                  <SaveRow
                    label="자동 저장"
                    meta={`${saveMeta.auto.country} · ${saveMeta.auto.turn}분기`}
                    time={saveMeta.auto.savedAt}
                    onClick={() => loadGame('auto')}
                  />
                )}
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--color-ink-faint)]">{label}</dt>
      <dd className="tnum font-medium">{value}</dd>
    </div>
  );
}

function SaveRow({
  label,
  meta,
  time,
  onClick,
}: {
  label: string;
  meta: string;
  time: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition-colors hover:bg-[var(--color-surface-muted)]"
    >
      <span>
        <span className="block text-[12px] font-medium">{label}</span>
        <span className="block text-[11px] text-[var(--color-ink-faint)]">{meta}</span>
      </span>
      <span className="text-[10px] text-[var(--color-ink-faint)]">{formatDateTime(time)}</span>
    </button>
  );
}
