import { ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: ReactNode;
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

// Boton individual de la barra. Borde inferior 2px que marca el activo.
export function TabButton({ active, onClick, children }: TabButtonProps) {
  const state = active
    ? 'border-accent text-accent'
    : 'border-transparent text-text-muted hover:text-text';
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${state}`}>
      {children}
    </button>
  );
}

interface Props {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * Barra de pestañas tokenizada. Reemplaza los tabs locales por pagina.
 * Borde inferior comun (border-b border-border) y cada tab marca el activo
 * con su propio borde inferior naranja (border-accent text-accent).
 */
export default function Tabs({ items, value, onChange, className = '' }: Props) {
  return (
    <div role="tablist" className={`flex items-center border-b border-border ${className}`}>
      {items.map((item) => (
        <TabButton
          key={item.id}
          active={item.id === value}
          onClick={() => onChange(item.id)}>
          {item.label}
        </TabButton>
      ))}
    </div>
  );
}
