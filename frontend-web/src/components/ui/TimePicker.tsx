import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

// Mismo estilo de trigger que el Input tokenizado del proyecto.
const trigger =
  'w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-left ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

interface Props {
  value?: string; // "HH:mm" en 24h, o vacio
  onChange: (v: string) => void;
  minuteStep?: number; // incremento de minutos (default 30)
  className?: string;
}

// Convierte "HH:mm" (24h) a etiqueta 12h con AM/PM (ej. "08:00 PM").
function formatTo12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const hh = String(hour12).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm} ${period}`;
}

/**
 * Selector de hora propio en popover. Lista horas de 00:00 a 23:59 segun el
 * paso de minutos; muestra etiquetas en 12h pero emite "HH:mm" en 24h.
 * Cierra al hacer click fuera o con Escape.
 */
export default function TimePicker({
  value = '',
  onChange,
  minuteStep = 30,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Genera todas las opciones "HH:mm" con un bucle simple sobre horas/minutos.
  const options = useMemo(() => {
    const list: string[] = [];
    for (let h = 0; h < 24; h += 1) {
      for (let m = 0; m < 60; m += minuteStep) {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        list.push(`${hh}:${mm}`);
      }
    }
    return list;
  }, [minuteStep]);

  // Cierre con Escape mientras este abierto.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Cierre al hacer click fuera del contenedor (trigger + popover).
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // Selecciona una opcion: emite 24h y cierra.
  const handleSelect = (time: string) => {
    onChange(time);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger con el mismo estilo que Input + icono Clock a la derecha. */}
      <button type="button" onClick={() => setOpen((o) => !o)} className={trigger}>
        {value ? (
          <span className="text-text">{formatTo12h(value)}</span>
        ) : (
          <span className="text-text-muted">--:--</span>
        )}
        <Clock
          size={18}
          strokeWidth={1.75}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
      </button>

      {/* Popover con la lista de horas. */}
      {open && (
        <div className="absolute z-50 mt-1 bg-surface border border-border rounded-xl shadow-xl w-40 max-h-60 overflow-auto p-1">
          {options.map((time) => {
            const selected = time === value;
            return (
              <button
                key={time}
                type="button"
                onClick={() => handleSelect(time)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition ${
                  selected
                    ? 'bg-accent-fill text-accent-contrast'
                    : 'text-text hover:bg-surface-alt'
                }`}>
                {formatTo12h(time)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
