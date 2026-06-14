import { ReactNode } from 'react';

interface Props {
  label?: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}

/**
 * Wrapper de formulario: etiqueta + control + texto de ayuda. Reemplaza los
 * bloques label/hint duplicados por pantalla. El control va en children.
 */
export default function Field({ label, hint, htmlFor, children }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-text">
          {label}
        </label>
      )}
      {children}
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
