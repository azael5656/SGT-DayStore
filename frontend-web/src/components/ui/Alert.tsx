import { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const VAR: Record<Tone, string> = {
  info: '--info',
  success: '--success',
  warning: '--warning',
  danger: '--danger',
};

const ICON: Record<Tone, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

interface Props {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
}

/**
 * Aviso/banner. Estilo intencional (no "chip pastel"): tarjeta sobre superficie,
 * con una barra lateral del color del estado y el icono en color; el texto va en
 * el color neutro normal. Se lee como una notificación real de la app.
 */
export default function Alert({ tone = 'info', title, children }: Props) {
  const v = `var(${VAR[tone]})`;
  const Icon = ICON[tone];
  return (
    <div
      className="flex items-start gap-3 bg-surface border border-border rounded-xl p-3"
      style={{ borderLeftColor: v, borderLeftWidth: 4 }}>
      <Icon size={18} strokeWidth={2} className="mt-0.5 shrink-0" style={{ color: v }} />
      <div className="min-w-0 text-sm text-text">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className="text-text-muted">{children}</div>}
      </div>
    </div>
  );
}
