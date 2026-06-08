import { ButtonHTMLAttributes, ReactNode } from 'react';

// Clases base compartidas por ambos estados (activo/inactivo).
const base =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed';

// Activo: relleno naranja de marca. Inactivo: superficie 2 con hover al acento.
const ACTIVE = 'bg-accent-fill text-accent-contrast border-accent-fill';
const INACTIVE = 'bg-surface-alt text-text border-border hover:border-accent';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  leftIcon?: ReactNode;
}

/**
 * Chip toggle de selección (moneda/método/tipo). Un solo botón que alterna
 * entre estado activo (acento) e inactivo (neutro) según la prop `active`.
 */
export default function Chip({
  active = false,
  leftIcon,
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`${base} ${active ? ACTIVE : INACTIVE} ${className}`}
      {...rest}>
      {leftIcon}
      {children}
    </button>
  );
}
