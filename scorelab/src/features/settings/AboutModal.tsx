/** 계산 방식과 한계를 밝히는 안내. 성적은 민감한 값이라 무엇을 보장하고 무엇을 못 하는지 분명히 적는다. */
import { APP } from '../../lib/config';
import { ModalBody, ModalFoot, ModalHead } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';

const POINTS: { icon: Parameters<typeof Icon>[0]['name']; title: string; body: string }[] = [
  {
    icon: 'target',
    title: '반올림 오차가 없습니다',
    body: '모든 점수와 비율을 분수(BigInt)로 계산합니다. 0.1 을 세 번 더해도 정확히 0.3 이고, 89.999점은 절대 90점으로 취급되지 않습니다.',
  },
  {
    icon: 'layers',
    title: '입력 간격을 지킵니다',
    body: '0.5점 단위로만 받을 수 있는 수행평가라면 "16.3점 필요" 대신 실제로 받아야 하는 16.5점을 알려 줍니다. 만점은 간격의 배수가 아니어도 유효한 끝점으로 봅니다.',
  },
  {
    icon: 'lock',
    title: '기기에 먼저 저장합니다',
    body: '로그인하지 않으면 데이터는 이 브라우저를 벗어나지 않습니다. 로그인하면 계정별로 분리된 행에 저장되고, 다른 사람은 읽을 수 없습니다.',
  },
];

const LIMITS_TEXT = [
  '학교의 실제 반영 비율·성취도 기준·공식 반올림 규칙은 자동으로 알 수 없습니다. 직접 확인해 입력하세요.',
  '계산 결과는 참고용입니다. 최종 성적은 학교가 산출합니다.',
  '브라우저 저장소를 지우면 로그인하지 않은 데이터는 사라집니다. 중요한 값은 JSON 으로 백업하세요.',
];

export function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <ModalHead
        title={`${APP.korean} 는 이렇게 계산합니다`}
        description={APP.tagline}
        icon="sparkles"
        onClose={onClose}
      />
      <ModalBody>
        <div className="list">
          {POINTS.map((point) => (
            <div key={point.title} className="list__item" style={{ alignItems: 'flex-start' }}>
              <span className="list__icon">
                <Icon name={point.icon} size={17} />
              </span>
              <span className="list__text">
                <span className="list__title">{point.title}</span>
                <span className="list__sub" style={{ lineHeight: 1.6 }}>
                  {point.body}
                </span>
              </span>
            </div>
          ))}
        </div>

        <hr className="divider" />

        <div>
          <p className="field__label" style={{ marginBottom: 8 }}>
            알아 두세요
          </p>
          <ul className="muted" style={{ paddingLeft: 18, display: 'grid', gap: 6 }}>
            {LIMITS_TEXT.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </ModalBody>
      <ModalFoot align="end">
        <button type="button" className="btn btn--primary" data-autofocus onClick={onClose}>
          확인
        </button>
      </ModalFoot>
    </>
  );
}
