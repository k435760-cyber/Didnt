/** 모달의 겉모양. 내용은 각 기능이 children 으로 넣는다. */
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

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
  return (
    <header className="modal__head">
      {icon && (
        <div className={`modal__icon modal__icon--${tone}`}>
          <Icon name={icon} size={20} />
        </div>
      )}
      <div className="modal__titles">
        <h2 className="modal__title" id={titleId}>
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
