-- 앱이 더 이상 예시 과목을 만들지 않는다. sample 플래그는 쓰이는 곳이 없으므로 지운다.
-- (default 가 있어서 예전 클라이언트가 값을 보내지 않아도 문제가 없었고,
--  지운 뒤에도 남은 데이터는 그대로다. 컬럼 하나만 사라진다.)
alter table public.sl_subjects drop column if exists sample;

-- 과목 순서를 서버에서도 읽는다. 다른 기기에서 받아온 과목을 어디에 놓을지 정할 때 쓴다.
create index if not exists sl_subjects_user_position_idx
  on public.sl_subjects (user_id, position);
