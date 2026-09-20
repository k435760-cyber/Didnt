/** 작은 공용 조각들. */
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="switch" style={{ width: '100%', justifyContent: 'space-between' }}>
      <span className="list__text">
        <span className="list__title">{label}</span>
        {description && <span className="list__sub">{description}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
    </label>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  block,
  label,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (next: T) => void;
  block?: boolean;
  label?: string;
}) {
  return (
    <div className={`segmented${block ? ' segmented--block' : ''}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="segmented__option"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  unit,
  compact,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  unit?: string;
  /** 숫자 한두 자리만 받는 칸. 넓은 화면에서 지나치게 늘어나지 않게 한다. */
  compact?: boolean;
}) {
  return (
    <label className={`field${compact ? ' field--compact' : ''}`}>
      <span className="field__label">
        <span>{label}</span>
        {hint && <span className="field__hint">{hint}</span>}
      </span>
      {unit ? (
        <span className="input-affix">
          {children}
          <span className="input-affix__unit">{unit}</span>
        </span>
      ) : (
        children
      )}
      {error && (
        <span className="field__error">
          <Icon name="alert" size={13} />
          {error}
        </span>
      )}
    </label>
  );
}

export function Meter({
  value,
  max = 100,
  marks = [],
  label = '현재 점수',
}: {
  value: number;
  max?: number;
  marks?: number[];
  /** 스크린 리더가 읽을 이름. progressbar 는 이름이 없으면 무엇의 진행인지 알 수 없다. */
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className="meter"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value * 10) / 10}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className="meter__fill" style={{ width: `${pct}%` }} />
      {marks.map((mark) => (
        <div
          key={mark}
          className="meter__mark"
          style={{ left: `${Math.min(100, (mark / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export function Empty({
  icon = 'search',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} size={24} />
      </span>
      <span className="empty__title">{title}</span>
      {description && <span style={{ fontSize: 13, maxWidth: 320 }}>{description}</span>}
      {action}
    </div>
  );
}

export function Banner({ tone, children }: { tone: 'info' | 'warn' | 'bad'; children: ReactNode }) {
  return (
    <div className={`banner banner--${tone}`}>
      <span className="banner__icon">
        <Icon name={tone === 'info' ? 'info' : 'alert'} size={16} />
      </span>
      <span className="banner__text">{children}</span>
    </div>
  );
}

export function Avatar({
  name,
  src,
  size = 'sm',
}: {
  name: string;
  src?: string | null;
  size?: 'sm' | 'lg';
}) {
  const cls = size === 'lg' ? 'avatar avatar--lg' : 'avatar';
  if (src) return <img className={cls} src={src} alt="" referrerPolicy="no-referrer" />;
  return (
    <span className={`${cls} avatar--fallback`} aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
