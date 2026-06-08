import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

type MaxWidth = 'sm' | 'md' | 'lg';

// Ancho del panel segun la prop. Radios y superficie tokenizados.
const MAX_WIDTH: Record<MaxWidth, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-xl',
};

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: MaxWidth;
}

/**
 * Modal sobre overlay oscuro. Cierra al hacer click fuera de la tarjeta
 * o con la tecla Escape. Reemplaza los overlays inline de cada pagina.
 */
export default function Modal({ open, onClose, title, children, maxWidth = 'md' }: Props) {
  // Cierre con Escape mientras este abierto.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      {/* Detiene la propagacion para no cerrar al clicar dentro de la tarjeta. */}
      <div
        className={`bg-surface text-text border border-border rounded-2xl shadow-xl w-full ${MAX_WIDTH[maxWidth]}`}
        onClick={(e) => e.stopPropagation()}>
        {/* Header: titulo + boton cerrar (solo si hay titulo). */}
        {title && (
          <div className="flex items-center justify-between gap-3 border-b border-border p-5">
            <h2 className="font-heading font-bold text-lg">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="text-text-muted hover:text-text transition">
              <X size={20} strokeWidth={1.75} />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
