/** 모달의 겉모양. 내용은 각 기능이 children 으로 넣는다. */
import { createContext, useContext, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/**
 * 모달 컨테이너가 자기 aria-labelledby id 를 헤더에 내려 준다.
 * 이게 없으면 dialog 의 aria-labelledby 가 존재하지 않는 id 를 가리킨다.
 */
const ModalIdContext = createContext<string | undefined>(undefined);
export const ModalIdProvider = ModalIdContext.Provider;
export const useModalTitleId = () => useContext(ModalIdContext);

export type ModalTone = 'brand' | 'warn' | 'danger' | 'ok';

interface ModalHeadProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  tone?: ModalTone;
  onClose?: () => void;
  titleId?: string;
  descId?: string;
}

export function ModalHead({
  title,
  description,
  icon,
  tone = 'brand',
  onClose,
  titleId,
  descId,
}: ModalHeadProps) {
  // 모달 컨테이너의 aria-labelledby 가 가리키는 id 를 그대로 받아 제목에 건다.
  const fallbackId = useModalTitleId();
  const headingId = titleId ?? fallbackId;
  return (
    <header className="modal__head">
      {icon && (
        <div className={`modal__icon modal__icon--${tone}`}>
          <Icon name={icon} size={20} />
        </div>
      )}
      <div className="modal__titles">
        <h2 className="modal__title" id={headingId}>
          {title}
        </h2>
        {description && (
          <p className="modal__desc" id={descId}>
            {description}
          </p>
        )}
      </div>
      {onClose && (
        <button type="button" className="modal__close" onClick={onClose} aria-label="닫기">
          <Icon name="close" size={18} />
        </button>
      )}
    </header>
  );
}

export function ModalBody({ children, flush }: { children: ReactNode; flush?: boolean }) {
  return <div className={`modal__body${flush ? ' modal__body--flush' : ''}`}>{children}</div>;
}

export function ModalFoot({ children, align }: { children: ReactNode; align?: 'end' }) {
  return (
    <footer className={`modal__foot${align === 'end' ? ' modal__foot--end' : ''}`}>
      {children}
    </footer>
  );
}
