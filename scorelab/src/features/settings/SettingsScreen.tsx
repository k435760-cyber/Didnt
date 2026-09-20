/** 설정 화면. 모든 세부 항목은 모달로 열린다. */
import { APP, SUPABASE_URL } from '../../lib/config';
import { relativeTime } from '../../lib/format';
import { Icon } from '../../ui/Icon';
import { Avatar, Switch, Segmented } from '../../ui/primitives';
import { useModal } from '../../ui/ModalProvider';
import { useToast } from '../../ui/Toast';
import { useAuth } from '../../state/auth';
import { useCloud } from '../../state/cloud';
import { useSettings, type ThemeMode } from '../../state/settings';
import { useWorkspace } from '../../state/workspace';
import { AccountModal } from '../auth/AccountModal';
import { AuthModal } from '../auth/AuthModal';
import { InstallModal } from '../pwa/InstallModal';
import type { PwaState } from '../pwa/usePwa';
import { DataModal } from './DataModal';
import { AboutModal } from './AboutModal';

/** 주소가 비어 있거나 형식이 틀려도 화면이 죽지 않게 감싼다. */
const backendHost = (() => {
  try {
    return new URL(SUPABASE_URL).host;
  } catch {
    return null;
  }
})();

export function SettingsScreen({ pwa }: { pwa: PwaState }) {
  const { settings, set, toggle } = useSettings();
  const { account, status: authStatus, configured } = useAuth();
  const { status: cloudStatus, lastReport, sync } = useCloud();
  const { workspace } = useWorkspace();
  const modal = useModal();
  const toast = useToast();

  const openAccount = () =>
    account
      ? modal.open(({ close }) => <AccountModal onClose={() => close()} />, { size: 'sm' })
      : modal.open(({ close }) => <AuthModal onClose={() => close()} />, { size: 'md' });

  return (
    <div className="page page--narrow">
      <header className="page__head">
        <div>
          <h1 className="page__title">설정</h1>
          <p className="page__sub">
            {APP.korean} v{APP.version}
          </p>
        </div>
      </header>

      <section className="card">
        <div className="card__head">
          <span className="card__title">계정</span>
        </div>
        <div className="card__body" style={{ paddingTop: 12 }}>
          {authStatus === 'loading' ? (
            <div className="skeleton" style={{ height: 56 }} />
          ) : account ? (
            <button type="button" className="account-chip" onClick={() => void openAccount()}>
              <Avatar name={account.name} src={account.avatar} />
              <span className="account-chip__text">
                <span className="account-chip__name">{account.name}</span>
                <span className="account-chip__sub">{account.email ?? '로그인됨'}</span>
              </span>
              <Icon name="chevron-right" size={18} />
            </button>
          ) : (
            <div className="stack">
              <p className="muted" style={{ margin: 0 }}>
                {configured
                  ? '로그인하지 않아도 모든 계산 기능을 쓸 수 있어요. 여러 기기에서 같은 데이터를 보려면 로그인하세요.'
                  : '이 빌드에는 백엔드 주소가 들어 있지 않아 로그인과 동기화를 쓸 수 없어요. 데이터는 이 기기에만 저장되니 가끔 내보내 두세요.'}
              </p>
              {configured && (
                <button
                  type="button"
                  className="btn btn--primary btn--block"
                  onClick={() => void openAccount()}
                >
                  <Icon name="cloud" size={17} />
                  Google 계정으로 로그인
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card__head">
          <span className="card__title">화면</span>
        </div>
        <div className="card__body stack">
          <div className="field">
            <span className="field__label">테마</span>
            <Segmented
              block
              label="테마"
              value={settings.theme}
              onChange={(theme: ThemeMode) => set('theme', theme)}
              options={[
                { value: 'system', label: '시스템' },
                { value: 'light', label: '밝게' },
                { value: 'dark', label: '어둡게' },
              ]}
            />
          </div>
          <hr className="divider" />
          <Switch
            checked={settings.gradient}
            onChange={() => toggle('gradient')}
            label="배경 그라데이션"
            description="은은하게 움직이는 색 배경을 켜고 끕니다."
          />
          <hr className="divider" />
          <Switch
            checked={settings.showSteps}
            onChange={() => toggle('showSteps')}
            label="계산 과정 보이기"
            description="역산 결과 아래에 어떻게 나온 숫자인지 단계별로 표시합니다."
          />
        </div>
      </section>

      <section className="card">
        <div className="card__head">
          <span className="card__title">동기화</span>
          <span className="card__sub">
            {account ? (cloudStatus === 'error' ? '오류' : '켜짐') : '로그인 필요'}
          </span>
        </div>
        <div className="card__body stack">
          <Switch
            checked={settings.autoSync}
            onChange={() => toggle('autoSync')}
            disabled={!account}
            label="자동 동기화"
            description={
              account
                ? lastReport
                  ? `마지막 동기화 ${relativeTime(lastReport.at)} · 과목과 표시 설정을 함께 맞춥니다`
                  : '편집이 끝나면 과목과 표시 설정을 자동으로 올립니다.'
                : configured
                  ? '로그인하면 켤 수 있어요.'
                  : '이 빌드에서는 쓸 수 없어요.'
            }
          />
          {account && (
            <button
              type="button"
              className="btn btn--block"
              onClick={async () => {
                const report = await sync();
                toast.show(report ? '동기화했어요.' : '동기화하지 못했어요.', {
                  tone: report ? 'ok' : 'bad',
                });
              }}
            >
              <Icon
                name="refresh"
                size={17}
                className={cloudStatus === 'syncing' ? 'spin' : undefined}
              />
              지금 동기화
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card__head">
          <span className="card__title">데이터와 앱</span>
        </div>
        <div className="list">
          <button
            type="button"
            className="list__item"
            onClick={() =>
              void modal.open(({ close }) => <DataModal onClose={() => close()} />, { size: 'md' })
            }
          >
            <span className="list__icon">
              <Icon name="layers" size={17} />
            </span>
            <span className="list__text">
              <span className="list__title">내보내기 · 가져오기</span>
              <span className="list__sub">
                과목 {workspace.subjects.length}개 · 마지막 수정 {relativeTime(workspace.updatedAt)}
              </span>
            </span>
            <Icon name="chevron-right" size={18} />
          </button>

          <button
            type="button"
            className="list__item"
            onClick={() =>
              void modal.open(({ close }) => <InstallModal pwa={pwa} onClose={() => close()} />, {
                size: 'sm',
              })
            }
          >
            <span className="list__icon">
              <Icon name="phone" size={17} />
            </span>
            <span className="list__text">
              <span className="list__title">앱으로 설치</span>
              <span className="list__sub">
                {pwa.installed ? '설치됨' : '홈 화면에 추가하고 오프라인으로 사용'}
              </span>
            </span>
            <Icon name="chevron-right" size={18} />
          </button>

          <button
            type="button"
            className="list__item"
            onClick={() =>
              void modal.open(({ close }) => <AboutModal onClose={() => close()} />, { size: 'md' })
            }
          >
            <span className="list__icon">
              <Icon name="info" size={17} />
            </span>
            <span className="list__text">
              <span className="list__title">이 앱에 대하여</span>
              <span className="list__sub">계산 방식과 한계</span>
            </span>
            <Icon name="chevron-right" size={18} />
          </button>
        </div>
      </section>

      <p className="muted" style={{ textAlign: 'center', paddingBottom: 8 }}>
        {APP.name} v{APP.version}
        {backendHost ? ` · 백엔드 ${backendHost}` : ' · 백엔드 없음'}
      </p>
    </div>
  );
}
