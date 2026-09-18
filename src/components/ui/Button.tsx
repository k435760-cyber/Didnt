'use client';

import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-40 border border-transparent',
  secondary:
    'bg-[var(--color-surface)] text-[var(--color-ink)] border hover:bg-[var(--color-surface-muted)] disabled:opacity-40',
  ghost:
    'bg-transparent text-[var(--color-ink-muted)] border border-transparent hover:bg-[var(--color-surface-muted)] disabled:opacity-40',
  danger:
    'bg-[var(--color-negative)] text-white hover:opacity-90 disabled:opacity-40 border border-transparent',
};

const SIZES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-[11px]',
  md: 'h-9 px-3.5 text-[13px]',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className ?? ''}`}
      {...props}
    />
  );
}
