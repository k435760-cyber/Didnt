/** 앱 셸: 내비게이션, 화면 전환, 시작 시 처리해야 할 안내들. */
import { useCallback, useEffect, useState } from 'react';
import { APP } from './lib/config';
import { Icon, type IconName } from './ui/Icon';
import { Avatar, Empty } from './ui/primitives';
import { useModal } from './ui/ModalProvider';
import { useToast } from './ui/Toast';
import { useAuth } from './state/auth';
import { useCloud } from './state/cloud';
import { useSettings } from './state/settings';
import { useWorkspace } from './state/workspace';
import { AccountModal } from './features/auth/AccountModal';
import { AuthModal } from './features/auth/AuthModal';
import { DashboardScreen } from './features/dashboard/DashboardScreen';
import { GoalScreen } from './features/calc/GoalScreen';
import { InstallModal } from './features/pwa/InstallModal';
import { usePwa } from './features/pwa/usePwa';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { SubjectScreen } from './features/subjects/SubjectScreen';
import { SubjectSwitcher } from './features/subjects/SubjectSwitcher';
import { useSubjectActions } from './features/subjects/actions';

type Tab = 'dashboard' | 'subject' | 'goal' | 'settings';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'dashboard', label: '홈', icon: 'home' },
  { id: 'subject', label: '과목', icon: 'book' },
  { id: 'goal', label: '목표', icon: 'target' },
  { id: 'settings', label: '설정', icon: 'settings' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const { workspace, activeSubject, saveState, loadIssue, dismissLoadIssue, dispatch } =
    useWorkspace();
  const { account, status: authStatus } = useAuth();
  const { status: cloudStatus } = useCloud();
  const { settings } = useSettings();
  const actions = useSubjectActions();
  const modal = useModal();
  const toast = useToast();
  const pwa = usePwa();

  // 홈 화면 바로가기(manifest shortcuts)로 들어왔으면 그 화면부터 연다.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    if (requested && TABS.some((t) => t.id === requested)) setTab(requested as Tab);
  }, []);

  // 저장본이 손상됐으면 처음 화면을 가리기 전에 알린다.
  useEffect(() => {
    if (!loadIssue) return;
    void modal
      .alert({
        title: '저장된 데이터를 읽지 못했어요',
        description: `${loadIssue.status === 'corrupt' ? loadIssue.message : ''}\n\n원본은 지우지 않고 따로 보관했습니다. 설정 → 데이터에서 내려받아 확인할 수 있어요.`,
        tone: 'warn',
        icon: 'alert',
        confirmText: '알겠어요',
      })
      .then(dismissLoadIssue);
  }, [loadIssue, modal, dismissLoadIssue]);

  // 새 버전이 준비되면 강제로 새로고침하지 않고 사용자가 고르게 한다.
  useEffect(() => {
    if (!pwa.updateReady) return;
    toast.show('새 버전이 준비됐어요.', {
      duration: 12000,
      icon: 'refresh',
      action: { label: '새로고침', onClick: pwa.applyUpdate },
    });
  }, [pwa.updateReady, pwa.applyUpdate, toast]);

  const openAccount = useCallback(() => {
    void (account
      ? modal.open(({ close }) => <AccountModal onClose={() => close()} />, { size: 'sm' })
      : modal.open(({ close }) => <AuthModal onClose={() => close()} />, { size: 'md' }));
  }, [account, modal]);

  const openSwitcher = useCallback(() => {
    void modal.open<void>(
      ({ close }) => (
        <SubjectSwitcher
          subjects={workspace.subjects}
          activeId={workspace.activeId}
          onPick={(id) => {
            dispatch({ type: 'active', id });
            setTab('subject');
            close();
          }}
          onCreate={() => {
            close();
            void actions.createSubject().then((created) => created && setTab('subject'));
          }}
          onEdit={(subject) => {
            close();
            void actions.editSubject(subject);
          }}
          onDuplicate={(subject) => {
            close();
            void actions.duplicateSubject(subject);
          }}
          onDelete={(subject) => {
            close();
            void actions.deleteSubject(subject);
          }}
          onClose={() => close()}
        />
      ),
      { size: 'md' },
    );
  }, [workspace.subjects, workspace.activeId, modal, dispatch, actions]);

  const openSubject = useCallback(
    (id: string) => {
      dispatch({ type: 'active', id });
      setTab('subject');
    },
    [dispatch],
  );

  // 과목을 만들고 나면 방금 만든 과목 화면으로 이어 준다.
  const startSubject = useCallback(
    () => void actions.createSubject().then((created) => created && setTab('subject')),
    [actions],
  );

  const screen = (() => {
    if (tab === 'dashboard') return <DashboardScreen onOpenSubject={openSubject} />;
    if (tab === 'settings') return <SettingsScreen pwa={pwa} />;
    if (!activeSubject) {
      return (
        <div className="page page--narrow">
          <header className="page__head">
            <div>
              <h1 className="page__title">{tab === 'goal' ? '목표' : '과목'}</h1>
              <p className="page__sub">아직 만든 과목이 없어요</p>
            </div>
          </header>
          <div className="card">
            <Empty
              icon="layers"
              title="과목을 먼저 만들어 주세요"
              description={
                tab === 'goal'
                  ? '과목과 평가를 넣으면 목표까지 몇 점이 필요한지 역산해 드릴게요.'
                  : '과목을 하나 만들면 평가를 넣고 점수를 계산할 수 있어요.'
              }
              action={
                <button type="button" className="btn btn--primary" onClick={startSubject}>
                  <Icon name="plus" size={17} />
                  과목 만들기
                </button>
              }
            />
          </div>
        </div>
      );
    }
    return tab === 'subject' ? (
      <SubjectScreen subject={activeSubject} />
    ) : (
      <GoalScreen subject={activeSubject} />
    );
  })();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="topbar__mark">
            <Icon name="zap" size={17} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span className="sidebar__name" style={{ display: 'block' }}>
              {APP.name}
            </span>
            <span className="sidebar__tag">{APP.korean}</span>
          </span>
        </div>

        <nav className="sidebar__nav" aria-label="주요 메뉴">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="sidebar__item"
              aria-current={tab === item.id ? 'page' : undefined}
              onClick={() => setTab(item.id)}
            >
              <Icon name={item.icon} size={19} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar__foot">
          <button type="button" className="sidebar__item" onClick={openSwitcher}>
            <Icon name="layers" size={19} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeSubject?.name ?? '과목 없음'}
            </span>
          </button>
          {!pwa.installed && (
            <button
              type="button"
              className="sidebar__item"
              onClick={() =>
                void modal.open(({ close }) => <InstallModal pwa={pwa} onClose={() => close()} />, {
                  size: 'sm',
                })
              }
            >
              <Icon name="download" size={19} />앱 설치
            </button>
          )}
          <button type="button" className="account-chip" onClick={openAccount}>
            {account ? (
              <Avatar name={account.name} src={account.avatar} />
            ) : (
              <span className="list__icon">
                <Icon name="user" size={17} />
              </span>
            )}
            <span className="account-chip__text">
              <span className="account-chip__name">{account?.name ?? '로그인'}</span>
              <span className="account-chip__sub">
                {authStatus === 'loading'
                  ? '확인 중…'
                  : account
                    ? cloudStatus === 'error'
                      ? '동기화 오류'
                      : '동기화 켜짐'
                    : '이 기기에만 저장 중'}
              </span>
            </span>
          </button>
        </div>
      </aside>

      <header className="topbar">
        <span className="topbar__mark" aria-hidden="true">
          <Icon name="zap" size={16} />
        </span>
        <button
          type="button"
          className="topbar__brand"
          onClick={openSwitcher}
          aria-label="과목 바꾸기"
          style={{ minWidth: 0 }}
        >
          <span className="topbar__title">
            {tab === 'dashboard' ? APP.name : (activeSubject?.name ?? APP.name)}
          </span>
          <Icon name="chevron-down" size={16} />
        </button>
        <span className="topbar__spacer" />
        <span className="topbar__actions">
          <SaveDot
            state={saveState}
            syncing={cloudStatus === 'syncing'}
            gradient={settings.gradient}
          />
          <button
            type="button"
            className="btn btn--sm btn--icon btn--ghost"
            aria-label="계정"
            onClick={openAccount}
          >
            {account ? (
              <Avatar name={account.name} src={account.avatar} />
            ) : (
              <Icon name="user" size={19} />
            )}
          </button>
        </span>
      </header>

      <main className="main">{screen}</main>

      <nav className="tabbar" aria-label="주요 메뉴">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="tabbar__item"
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => setTab(item.id)}
          >
            <span className="tabbar__icon">
              <Icon name={item.icon} size={20} />
            </span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

/** 저장·동기화 상태를 아주 작게 알린다. 평소에는 아무것도 보이지 않는다. */
function SaveDot({
  state,
  syncing,
  gradient,
}: {
  state: string;
  syncing: boolean;
  gradient: boolean;
}) {
  const { toggle } = useSettings();
  if (syncing || state === 'saving') {
    return (
      <span className="badge" title="저장 중">
        <Icon name="refresh" size={13} className="spin" />
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="badge badge--bad" title="저장하지 못했어요">
        <Icon name="alert" size={13} />
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="badge badge--ok" title="저장됨">
        <Icon name="check" size={13} />
      </span>
    );
  }
  // 조용할 때는 그라데이션 토글을 여기에 둔다. 가장 자주 만지는 표시 설정이라서.
  return (
    <button
      type="button"
      className="btn btn--sm btn--icon btn--ghost"
      aria-label={gradient ? '배경 그라데이션 끄기' : '배경 그라데이션 켜기'}
      aria-pressed={gradient}
      onClick={() => toggle('gradient')}
    >
      <Icon name={gradient ? 'palette' : 'moon'} size={18} />
    </button>
  );
}
