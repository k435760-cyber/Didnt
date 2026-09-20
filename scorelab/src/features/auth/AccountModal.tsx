/** 로그인한 계정 정보와 동기화 상태. */
import { useState } from 'react';
import { ModalBody, ModalFoot, ModalHead } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';
import { Avatar } from '../../ui/primitives';
import { useAuth } from '../../state/auth';
import { useCloud } from '../../state/cloud';
import { useModal } from '../../ui/ModalProvider';
import { useToast } from '../../ui/Toast';
import { dateTime } from '../../lib/format';

export function AccountModal({ onClose }: { onClose: () => void }) {
  const { account, signOut } = useAuth();
  const { status, lastReport, lastError, sync, wipe } = useCloud();
  const modal = useModal();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (!account) return null;

  const runSync = async () => {
    setBusy(true);
    const report = await sync();
    setBusy(false);
    if (report) {
      toast.ok(
        report.pushed || report.pulled
          ? `동기화 완료 — 올림 ${report.pushed}개, 받음 ${report.pulled}개`
          : '이미 최신 상태예요.',
      );
    } else {
      toast.error('동기화하지 못했어요.');
    }
  };

  const confirmWipe = async () => {
    const ok = await modal.confirm({
      title: '클라우드 데이터를 지울까요?',
      description:
        '이 계정에 저장된 과목이 서버에서 모두 삭제됩니다. 이 기기에 있는 데이터는 그대로 남아요.',
      confirmText: '서버에서 삭제',
      destructive: true,
    });
    if (!ok) return;
    try {
      await wipe();
      toast.ok('클라우드 데이터를 지웠어요.');
    } catch {
      toast.error('삭제하지 못했어요.');
    }
  };

  const confirmSignOut = async () => {
    const ok = await modal.confirm({
      title: '로그아웃할까요?',
      description: '이 기기에 저장된 과목은 그대로 남습니다.',
      confirmText: '로그아웃',
    });
    if (!ok) return;
    await signOut();
    toast.show('로그아웃했어요.');
    onClose();
  };

  return (
    <>
      <ModalHead title="내 계정" icon="user" onClose={onClose} />
      <ModalBody>
        <div className="row" style={{ gap: 14 }}>
          <Avatar name={account.name} src={account.avatar} size="lg" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{account.name}</div>
            <div className="muted">{account.email ?? '이메일 없음'}</div>
            <div className="badge badge--brand" style={{ marginTop: 6 }}>
              {account.provider === 'google' ? 'Google 계정' : account.provider}
            </div>
          </div>
        </div>

        <hr className="divider" />

        <div className="list">
          <div className="list__item">
            <span className="list__icon">
              <Icon name={status === 'error' ? 'cloud-off' : 'cloud'} size={17} />
            </span>
            <span className="list__text">
              <span className="list__title">동기화 상태</span>
              <span className="list__sub">
                {status === 'error'
                  ? (lastError ?? '문제가 있었어요')
                  : lastReport
                    ? `마지막 ${dateTime(lastReport.at)} · 올림 ${lastReport.pushed} / 받음 ${lastReport.pulled}`
                    : '아직 동기화하지 않았어요'}
              </span>
            </span>
          </div>
          {lastReport && lastReport.skipped.length > 0 && (
            <div className="list__item">
              <span className="list__icon">
                <Icon name="alert" size={17} />
              </span>
              <span className="list__text">
                <span className="list__title">건너뛴 과목 {lastReport.skipped.length}개</span>
                <span className="list__sub">{lastReport.skipped.join(', ')}</span>
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn btn--soft btn--block"
          onClick={() => void runSync()}
          disabled={busy}
        >
          <Icon name="refresh" size={17} className={busy ? 'spin' : undefined} />
          지금 동기화
        </button>

        <button
          type="button"
          className="btn btn--danger btn--block"
          onClick={() => void confirmWipe()}
        >
          <Icon name="trash" size={17} />
          클라우드 데이터 삭제
        </button>
      </ModalBody>
      <ModalFoot>
        <button type="button" className="btn" onClick={onClose}>
          닫기
        </button>
        <button
          type="button"
          className="btn btn--danger-solid"
          onClick={() => void confirmSignOut()}
        >
          <Icon name="logout" size={17} />
          로그아웃
        </button>
      </ModalFoot>
    </>
  );
}
