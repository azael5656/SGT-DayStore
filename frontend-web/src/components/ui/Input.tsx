import { InputHTMLAttributes, ReactNode } from 'react';

// Clases base tokenizadas: imita el patron de inputCls del proyecto.
const base =
  'w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-text ' +
  'placeholder:text-text-muted focus:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-accent disabled:opacity-50';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  error?: boolean;
}

/**
 * Input tokenizado. Soporta icono a la izquierda (padding mayor) y estado de
 * error (borde danger). Reemplaza los inputCls duplicados por pantalla.
 */
export default function Input({
  leftIcon,
  error = false,
  className = '',
  ...rest
}: Props) {
  // Con icono: mas padding izquierdo. Con error: borde rojo de estado.
  const pad = leftIcon ? 'pl-9' : '';
  const ring = error ? 'border-danger' : '';

  return (
    <div className="relative">
      {leftIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
          {leftIcon}
        </span>
      )}
      <input className={`${base} ${pad} ${ring} ${className}`} {...rest} />
    </div>
  );
}
