# ScoreLab (스코어랩)

내신 점수 계산기입니다. 지필·수행 평가의 반영 비율과 만점을 넣으면 **지금 점수**, **가능한 점수 범위**,
**목표까지 실제로 받아야 하는 점수**를 계산합니다.

업로드된 `how-many-points` 를 참고해 요구사항을 정리했고, 코드는 한 줄도 가져오지 않은 새 구현입니다.

- **오차 없는 계산** — 모든 값을 BigInt 분수로 다룹니다. `0.1 + 0.2` 가 `0.3` 이고, 89.999점은 절대 90점으로 취급되지 않습니다.
- **예시 데이터 없음** — 처음 열면 과목이 하나도 없습니다. 남의 점수를 내 점수인 척 앉혀 두는 대신,
  첫 화면에서 세 단계 사용법을 안내합니다. "예시를 지우는 일" 부터 시작하지 않아도 됩니다.
- **자체 모달** — `alert` / `confirm` / `prompt` 를 한 번도 쓰지 않습니다. 확인·입력·오류·로그인·설치까지 전부 자체 모달 스택입니다.
  휴대폰의 뒤로 가기로도 닫힙니다.
- **평가 순서 바꾸기** — 목록에서 위·아래 버튼으로 옮깁니다. 드래그는 터치에서 오작동이 잦아 쓰지 않았습니다.
- **Google 로그인** — Supabase Auth (OAuth PKCE). 로그인하지 않아도 모든 계산 기능을 씁니다.
- **클라우드 동기화** — 과목 단위 LWW(마지막 쓰기 승리) + 삭제 묘비. 표시 설정(테마·그라데이션 등)도 계정을 따라다닙니다.
  행은 RLS 로 계정별로 격리됩니다.
- **은은한 배경 그라데이션** — 켜고 끌 수 있고 (`설정 → 화면`, 상단바 아이콘), 선택은 기기에 남습니다.
- **PWA** — 설치, 오프라인 실행, 업데이트 알림.

## 실행

이미 빌드된 `dist/` 가 함께 들어 있다면 **설치 없이** 바로 열 수 있습니다.

```sh
node scripts/serve-dist.mjs        # http://127.0.0.1:4173  (PORT=8080 으로 변경 가능)
```

의존성이 없는 스크립트라 `npm install` 이 필요 없습니다. `dist/index.html` 을 더블클릭하지 말고
꼭 이 서버로 여세요 — `file://` 에서는 서비스 워커와 로그인이 동작하지 않습니다.

소스를 고치려면:

```sh
npm install
npm run dev        # http://127.0.0.1:5173
npm run verify     # typecheck + test + build
npm run build      # dist/ 정적 산출물
npm run preview    # Vite 로 빌드 결과 확인
npm run serve      # 위의 의존성 없는 서버와 같음
npm run icons      # public/icons/*.png 다시 생성
```

Node 20.19+ 또는 22.12+ 가 필요합니다.

## 백엔드 설정

기본값으로 다음 Supabase 프로젝트를 씁니다. publishable key 는 브라우저에 공개되는 값이고,
접근 통제는 전부 Postgres RLS 정책이 합니다.

| 항목            | 값                                               |
| --------------- | ------------------------------------------------ |
| URL             | `https://dbneonomwrqwlbitwdtr.supabase.co`       |
| publishable key | `sb_publishable_Smg0o4U5qYTkrLygwhVUSA_YM7HwKjM` |

다른 프로젝트를 쓰려면 빌드 시 환경 변수로 덮어씁니다.

```sh
VITE_SUPABASE_URL=... VITE_SUPABASE_PUBLISHABLE_KEY=... npm run build
```

### 테이블

`supabase/migrations/0001_scorelab_init.sql` 이 만드는 것:

| 테이블         | 내용                                                            |
| -------------- | --------------------------------------------------------------- |
| `sl_profiles`  | 표시 이름, 프로필 사진, 기기 간 공유 설정(`prefs`)              |
| `sl_subjects`  | 과목 한 개 = 한 행. 평가와 성취도 기준은 JSONB                  |
| `sl_deletions` | 삭제 묘비. 오래된 기기가 지운 과목을 되살리지 못하게 함         |

`prefs` 에는 테마·배경 그라데이션·계산 과정 표시·자동 동기화 설정이 들어갑니다. 로그인하면 서버 값을 먼저
받아 적용하고, 이후 설정을 바꿀 때마다 올립니다. 내려온 값은 `sanitizeSettings` 가 아는 키·타입만 통과시킵니다.

`0002_drop_sample.sql` 은 더 이상 쓰지 않는 `sample` 컬럼을 지웁니다. 기본값이 있는 컬럼이라 적용하지 않아도
동작에는 문제가 없고, 적용하면 컬럼 하나만 사라집니다. 과목 순서용 `(user_id, position)` 인덱스도 함께 만듭니다.

세 테이블 모두 RLS 가 켜져 있고 `auth.uid() = user_id` 정책 하나만 있습니다. publishable key 만으로는
남의 행을 읽을 수도 쓸 수도 없습니다.

### Google 로그인을 켜려면 (대시보드에서 한 번)

코드는 준비돼 있지만, 아래는 Supabase 대시보드에서 사람이 직접 해야 합니다.

1. **Google Cloud Console** → OAuth 클라이언트 ID(웹) 생성.
   - 승인된 리디렉션 URI: `https://<프로젝트>.supabase.co/auth/v1/callback`
2. **Supabase → Authentication → Sign In / Providers → Google** 을 켜고 클라이언트 ID·시크릿 입력.
3. **Supabase → Authentication → URL Configuration**
   - Site URL: 배포 주소
   - Redirect URLs: 배포 주소와 `http://127.0.0.1:5173` 을 모두 추가

설정 전에 로그인을 누르면 앱이 영어 오류를 그대로 보여 주지 않고 무엇을 해야 하는지 한국어로 안내합니다
(`src/lib/supabase.ts` 의 `describeAuthError`).

## 배포

정적 파일만 나옵니다. `dist/` 를 Vercel·Netlify·Cloudflare Pages 어디에 올려도 됩니다.

- SPA 라우팅과 캐시 규칙은 `public/_redirects`·`public/_headers` 가 들고 있고, 빌드 결과에 그대로 복사됩니다.
  Cloudflare Pages·Netlify 는 이 파일들을 바로 읽습니다. (다른 호스팅이라면 같은 내용을 그쪽 설정으로 옮기세요.)
- 서비스 워커(`/sw.js`)와 매니페스트는 **HTTPS** 에서만 동작합니다. (localhost 는 예외)
- 배포 주소를 Supabase 의 Redirect URLs 에 넣어야 로그인이 됩니다.
- 백엔드 주소 없이 빌드하면(`VITE_SUPABASE_URL=''`) 로그인·동기화 UI 가 스스로 빠지고 계산 기능만 남습니다.

## 구조

```
src/
  lib/          순수 로직. React 를 import 하지 않는다.
    rational.ts   BigInt 유리수 — 비교·올림·표시
    engine.ts     도메인 모델과 계산 (요약, 역산, 시나리오, 시뮬레이션)
    serialize.ts  저장 형식과 검증 — 들어오는 데이터는 전부 의심한다
    storage.ts    localStorage (실패를 값으로 돌려준다)
    sync.ts       Supabase 동기화 (LWW + 묘비)
  state/        Context 제공자 (설정 / 인증 / 워크스페이스 / 클라우드)
  ui/           모달 스택, 토스트, 입력 조각, 아이콘
  features/     화면과 화면별 모달
  styles/       토큰 → 기본 → 컴포넌트 → 레이아웃 → 모달 → 화면
```

설계 규칙 두 가지:

1. **`src/lib` 은 브라우저·React 에 의존하지 않습니다.** 그래서 계산을 통째로 테스트할 수 있습니다.
2. **모달 내용은 `ModalProvider` 하위에서 그려집니다.** 모달에서 쓰는 Context 는 전부 `ModalProvider`
   바깥에 있어야 합니다 (`src/main.tsx` 의 주석 참고).

## 계산 규칙

- 기여 점수 = `원점수 ÷ 만점 × 반영비율`. 합계가 최종 점수입니다.
- **확정**은 확보 점수에, **예상**은 예상 포함 점수에만 들어갑니다. **미입력**은 계산에서 빠지되
  적어 둔 점수는 지우지 않고 기억합니다.
- 역산은 이론값을 구한 뒤 **입력 간격의 배수로 올립니다.** 0.5점 단위 평가에서 16.3점이 필요하면 16.5점이
  답입니다. 돌려준 점수가 실제로 목표를 넘는지 테스트로 확인합니다.
- 만점은 입력 간격의 배수가 아니어도 항상 유효한 끝점입니다. (만점 7점 / 2점 단위 → 7점 유효)
- 등급컷 경계에 걸친 값은 표시 자릿수를 늘립니다. 89.999점을 "90점 인데 왜 A 가 아니죠?" 로 만들지 않습니다.

## 테스트

```sh
npm test
```

`rational` 12개, `engine` 35개, `serialize` 14개, `settings` 4개 — 모두 계산과 검증에 대한 것입니다.
UI 는 Playwright 로 모바일·데스크톱에서 확인했습니다 (첫 렌더, 빈 상태, 과목·평가 추가, 평가 순서 바꾸기,
모달 스택과 포커스 트랩, ESC·뒤로 가기 닫기, 그라데이션 토글, 테마 유지, 서비스 워커 등록, 오프라인 로드 등).

## 한계

- 학교의 실제 반영 비율·성취도 기준·공식 반올림 규칙은 자동으로 알 수 없습니다. 직접 확인해 입력해야 합니다.
- 계산 결과는 참고용이고, 최종 성적은 학교가 산출합니다.
- 로그인하지 않으면 데이터는 이 브라우저에만 있습니다. 저장소를 지우면 사라지므로 JSON 백업을 권합니다.
- 동기화는 과목 단위입니다. 두 기기에서 **같은 과목**을 동시에 고치면 나중에 저장한 쪽이 이깁니다.
