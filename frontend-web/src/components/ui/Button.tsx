import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed';

const SIZES: Record<Size, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-4 py-2.5',
};

const VARIANTS: Record<Variant, string> = {
  // Naranja sólido de marca (sin degradados). Texto de alto contraste por tema.
  primary: 'bg-accent-fill text-accent-contrast hover:brightness-95',
  secondary: 'bg-surface text-text border border-border hover:bg-surface-alt',
  ghost: 'text-text hover:bg-surface-alt',
  danger: 'bg-danger text-white hover:brightness-95',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  leftIcon,
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button className={`${base} ${SIZES[size]} ${VARIANTS[variant]} ${className}`} {...rest}>
      {leftIcon}
      {children}
    </button>
  );
}
