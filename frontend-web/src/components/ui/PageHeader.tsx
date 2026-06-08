import { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}

/**
 * Encabezado de página tokenizado. Reemplaza los títulos sueltos por pantalla:
 * a la izquierda icono + título + subtítulo, a la derecha las acciones.
 */
export default function PageHeader({ title, subtitle, icon, actions }: Props) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        {/* Icono de la sección en color de acento */}
        {icon && <span className="text-accent mt-1 shrink-0">{icon}</span>}
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-extrabold text-text">{title}</h1>
          {subtitle && <p className="text-sm text-text-muted mt-1">{subtitle}</p>}
        </div>
      </div>
      {/* Acciones de la página (botones, filtros…) */}
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
