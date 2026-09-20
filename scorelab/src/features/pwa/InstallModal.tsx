/** 앱 설치 안내. 브라우저 기본 배너 대신 이 모달에서 설치를 띄운다. */
import { useState } from 'react';
import { ModalBody, ModalFoot, ModalHead } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';
import { useToast } from '../../ui/Toast';
import type { PwaState } from './usePwa';

const PERKS: { icon: Parameters<typeof Icon>[0]['name']; text: string }[] = [
  { icon: 'zap', text: '홈 화면에서 바로 열립니다' },
  { icon: 'cloud-off', text: '인터넷이 끊겨도 계산은 그대로 됩니다' },
  { icon: 'phone', text: '주소창 없이 앱처럼 전체 화면으로' },
];

const IOS_STEPS = [
  { icon: 'share' as const, text: 'Safari 아래쪽의 공유 버튼을 누릅니다.' },
  { icon: 'plus' as const, text: '목록에서 "홈 화면에 추가" 를 고릅니다.' },
  { icon: 'check' as const, text: '오른쪽 위 "추가" 를 누르면 끝입니다.' },
];

export function InstallModal({ pwa, onClose }: { pwa: PwaState; onClose: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const install = async () => {
    setBusy(true);
    const outcome = await pwa.promptInstall();
    setBusy(false);
    if (outcome === 'accepted') {
      toast.ok('설치했어요. 홈 화면에서 열어 보세요.');
      onClose();
    } else if (outcome === 'dismissed') {
      toast.show('설치를 취소했어요. 언제든 설정에서 다시 할 수 있어요.');
    }
  };

  if (pwa.installed) {
    return (
      <>
        <ModalHead
          title="이미 설치되어 있어요"
          description="지금 앱 모드로 실행 중입니다."
          icon="check-circle"
          tone="ok"
          onClose={onClose}
        />
        <ModalFoot align="end">
          <button type="button" className="btn btn--primary" data-autofocus onClick={onClose}>
            확인
          </button>
        </ModalFoot>
      </>
    );
  }

  return (
    <>
      <ModalHead
        title="앱으로 설치하기"
        description="설치해도 용량은 거의 들지 않습니다. 같은 데이터를 그대로 씁니다."
        icon="phone"
        onClose={onClose}
      />
      <ModalBody>
        <div className="list">
          {PERKS.map((perk) => (
            <div key={perk.text} className="list__item">
              <span className="list__icon">
                <Icon name={perk.icon} size={17} />
              </span>
              <span className="list__text">
                <span className="list__title" style={{ fontWeight: 600 }}>
                  {perk.text}
                </span>
              </span>
            </div>
          ))}
        </div>

        {pwa.platform === 'ios' && (
          <>
            <hr className="divider" />
            <p className="field__label">iPhone · iPad 에서는 이렇게 추가합니다</p>
            <div className="list">
              {IOS_STEPS.map((step, index) => (
                <div key={step.text} className="list__item">
                  <span className="list__icon">{index + 1}</span>
                  <span className="list__text">
                    <span className="list__title" style={{ fontWeight: 600 }}>
                      {step.text}
                    </span>
                  </span>
                  <span className="list__right">
                    <Icon name={step.icon} size={17} />
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {pwa.platform !== 'ios' && !pwa.canPrompt && (
          <div className="banner banner--info">
            <span className="banner__icon">
              <Icon name="info" size={16} />
            </span>
            <span className="banner__text">
              지금은 브라우저가 설치 창을 내주지 않네요. 주소창 오른쪽의 설치 아이콘을 누르거나,
              브라우저 메뉴에서 "앱 설치" 를 골라 주세요.
            </span>
          </div>
        )}
      </ModalBody>
      <ModalFoot>
        <button type="button" className="btn" onClick={onClose}>
          닫기
        </button>
        {pwa.canPrompt && (
          <button
            type="button"
            className="btn btn--primary"
            data-autofocus
            onClick={() => void install()}
            disabled={busy}
          >
            <Icon name="download" size={17} />
            지금 설치
          </button>
        )}
      </ModalFoot>
    </>
  );
}
