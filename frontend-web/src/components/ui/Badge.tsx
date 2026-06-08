import { ReactNode } from 'react';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

// Cada tono apunta a una variable CSS, asi el badge se adapta solo a dark/light.
const VAR: Record<Tone, string> = {
  neutral: '--text-muted',
  success: '--success',
  warning: '--warning',
  danger: '--danger',
  info: '--info',
  accent: '--accent',
};

interface Props {
  tone?: Tone;
  children: ReactNode;
}

/**
 * Pildora de estado tokenizada. Reemplaza los mini-mapas de color por pagina
 * (SEVERIDAD_COLOR, ROLE_BADGE, EstadoBadge...). El tinte se calcula con
 * color-mix sobre el token, asi un solo componente cubre todos los estados.
 */
export default function Badge({ tone = 'neutral', children }: Props) {
  const v = `var(${VAR[tone]})`;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{
        color: v,
        backgroundColor: `color-mix(in srgb, ${v} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${v} 30%, transparent)`,
      }}>
      {children}
    </span>
  );
}
