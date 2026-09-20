-- ScoreLab (내신 점수 계산기) — 계정별 과목 동기화
-- 모든 테이블은 sl_ 접두사를 쓰고, 소유자 외에는 어떤 행도 볼 수 없다.

create table if not exists public.sl_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  -- 테마·그라데이션 같은 기기 간 공유 설정
  prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sl_subjects (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  memo text not null default '',
  hue smallint not null default 0,
  target numeric(8, 2) not null default 90,
  sample boolean not null default false,
  items jsonb not null default '[]'::jsonb,
  cuts jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  -- 마지막 쓰기 승리(LWW) 동기화의 기준이 되는 값. 클라이언트가 직접 설정한다.
  updated_at timestamptz not null default now(),
  constraint sl_subjects_name_len check (char_length(name) between 1 and 30),
  constraint sl_subjects_memo_len check (char_length(memo) <= 200),
  constraint sl_subjects_hue_range check (hue between 0 and 11),
  constraint sl_subjects_items_array check (jsonb_typeof(items) = 'array'),
  constraint sl_subjects_cuts_array check (jsonb_typeof(cuts) = 'array'),
  constraint sl_subjects_items_max check (jsonb_array_length(items) <= 40),
  constraint sl_subjects_cuts_max check (jsonb_array_length(cuts) <= 12)
);

create index if not exists sl_subjects_user_updated_idx
  on public.sl_subjects (user_id, updated_at desc);

-- 삭제 묘비. 한 기기에서 지운 과목이 다른 기기의 오래된 사본으로 되살아나지 않게 한다.
create table if not exists public.sl_deletions (
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null,
  deleted_at timestamptz not null default now(),
  primary key (user_id, subject_id)
);

alter table public.sl_profiles enable row level security;
alter table public.sl_subjects enable row level security;
alter table public.sl_deletions enable row level security;

drop policy if exists sl_profiles_owner on public.sl_profiles;
create policy sl_profiles_owner on public.sl_profiles
  for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists sl_subjects_owner on public.sl_subjects;
create policy sl_subjects_owner on public.sl_subjects
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists sl_deletions_owner on public.sl_deletions;
create policy sl_deletions_owner on public.sl_deletions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.sl_subjects is 'ScoreLab: 사용자별 과목. items/cuts 는 클라이언트 스키마 v2 JSON.';
comment on table public.sl_deletions is 'ScoreLab: 삭제된 과목 묘비. 동기화 시 부활 방지용.';
comment on table public.sl_profiles is 'ScoreLab: 표시 이름과 기기 간 공유 설정.';
