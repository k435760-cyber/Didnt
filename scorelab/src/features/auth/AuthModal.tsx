/** 구글 로그인 모달. 로그인하지 않아도 앱은 전부 쓸 수 있다는 점을 분명히 한다. */
import { useState } from 'react';
import { ModalBody, ModalFoot, ModalHead } from '../../ui/Modal';
import { GoogleMark, Icon } from '../../ui/Icon';
import { useAuth } from '../../state/auth';

const BENEFITS: { icon: Parameters<typeof Icon>[0]['name']; title: string; body: string }[] = [
  {
    icon: 'cloud',
    title: '기기 사이 동기화',
    body: '휴대폰에서 넣은 점수를 노트북에서 그대로 이어서 봅니다.',
  },
  {
    icon: 'refresh',
    title: '자동 백업',
    body: '브라우저 데이터를 지워도 과목과 점수가 남아 있습니다.',
  },
  { icon: 'lock', title: '내 계정만 접근', body: '데이터베이스 정책이 계정별로 행을 분리합니다.' },
];

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      // 성공하면 구글 동의 화면으로 이동한다. 이 모달은 페이지와 함께 사라진다.
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '로그인을 시작하지 못했어요.');
      setBusy(false);
    }
  };

  return (
    <>
      <ModalHead
        title="로그인하면 기기가 이어집니다"
        description="계정 없이도 모든 계산 기능을 쓸 수 있어요. 로그인은 여러 기기에서 같은 데이터를 보고 싶을 때만 필요합니다."
        icon="cloud"
        onClose={onClose}
      />
      <ModalBody>
        <div className="list">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="list__item">
              <span className="list__icon">
                <Icon name={benefit.icon} size={17} />
              </span>
              <span className="list__text">
                <span className="list__title">{benefit.title}</span>
                <span className="list__sub">{benefit.body}</span>
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="banner banner--bad">
            <span className="banner__icon">
              <Icon name="alert" size={16} />
            </span>
            <span className="banner__text">{error}</span>
          </div>
        )}

        <p className="muted">
          구글 계정의 이름·프로필 사진·이메일만 받아 옵니다. 점수 데이터는 계정에 묶여 저장되고,
          설정에서 언제든 지울 수 있어요.
        </p>
      </ModalBody>
      <ModalFoot>
        <button type="button" className="btn" onClick={onClose} disabled={busy}>
          나중에
        </button>
        <button
          type="button"
          className="btn btn--google"
          data-autofocus
          onClick={() => void start()}
          disabled={busy}
        >
          {busy ? <Icon name="refresh" size={17} className="spin" /> : <GoogleMark size={18} />}
          {busy ? '이동 중…' : 'Google 계정으로 계속'}
        </button>
      </ModalFoot>
    </>
  );
}
