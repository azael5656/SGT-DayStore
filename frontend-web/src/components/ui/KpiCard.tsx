import { CSSProperties, ReactNode } from 'react';

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

// Cada tono (salvo neutral) apunta a una variable CSS para la barra lateral.
const VAR: Record<Exclude<Tone, 'neutral'>, string> = {
  success: '--success',
  warning: '--warning',
  danger: '--danger',
};

interface Props {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
}

/**
 * Tarjeta de metrica (KPI). Reusa el patron de Card (surface + borde + radio)
 * y agrega un borde izquierdo de color por estado; neutral queda sin barra.
 * El numero usa font-heading para resaltar segun el sistema de diseno.
 */
export default function KpiCard({ label, value, sub, icon, tone = 'neutral' }: Props) {
  // Solo los tonos semanticos pintan la barra; neutral mantiene el borde normal.
  const accentStyle: CSSProperties =
    tone === 'neutral'
      ? {}
      : { borderLeftColor: `var(${VAR[tone]})`, borderLeftWidth: 4 };

  return (
    <div
      className="bg-surface border border-border rounded-2xl p-5"
      style={accentStyle}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
        {icon && <div className="shrink-0 text-accent">{icon}</div>}
      </div>
      <div className="font-heading text-2xl font-extrabold mt-1">{value}</div>
      {sub && <div className="text-sm text-text-muted">{sub}</div>}
    </div>
  );
}
