import { InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

/**
 * Checkbox del sistema de diseño. Oculta el nativo y dibuja una caja
 * tokenizada que se rellena de naranja al marcar. Acepta todos los props
 * de <input type="checkbox"> (checked, onChange, disabled...).
 */
export default function Checkbox({ label, className = '', ...rest }: Props) {
  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer select-none ${className}`}>
      <span className="relative inline-flex h-[18px] w-[18px] shrink-0">
        <input type="checkbox" className="peer sr-only" {...rest} />
        <span
          aria-hidden
          className="absolute inset-0 rounded-md border border-border bg-bg transition peer-checked:bg-accent-fill peer-checked:border-accent-fill peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-surface peer-disabled:opacity-50"
        />
        <Check
          size={13}
          strokeWidth={3}
          aria-hidden
          className="absolute inset-0 m-auto text-accent-contrast opacity-0 transition peer-checked:opacity-100 pointer-events-none"
        />
      </span>
      {label && <span className="text-sm text-text">{label}</span>}
    </label>
  );
}
