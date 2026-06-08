import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  value?: string; // YYYY-MM-DD o cadena vacia
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

// Dias de la semana (orden Lunes->Domingo) para la fila de encabezado.
const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

// Nombres de mes en espanol para el encabezado del calendario.
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Convierte una Date a la cadena local YYYY-MM-DD (sin desfase por zona horaria).
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Parsea YYYY-MM-DD a Date local; null si la cadena es vacia o invalida.
function parseISO(v: string): Date | null {
  if (!v) return null;
  const parts = v.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [y, m, day] = parts;
  return new Date(y, m - 1, day);
}

// Indice de columna (0=Lunes ... 6=Domingo) a partir del getDay() nativo (0=Domingo).
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

// Compara solo ano/mes/dia entre dos fechas.
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * DatePicker con calendario propio en popover. El trigger imita el estilo de
 * Input y muestra la fecha en DD/MM/YYYY. Cierra al click fuera y con Escape.
 */
export default function DatePicker({ value = '', onChange, placeholder = 'Selecciona una fecha', className = '' }: Props) {
  const [open, setOpen] = useState(false);
  // Fecha seleccionada (o null) derivada del value controlado.
  const selected = parseISO(value);
  // Mes visible: inicia en el value o en el mes actual.
  const [view, setView] = useState<Date>(() => {
    const base = parseISO(value) ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const rootRef = useRef<HTMLDivElement>(null);

  // Sincroniza el mes visible cuando el value cambia desde afuera.
  useEffect(() => {
    const parsed = parseISO(value);
    if (parsed) setView(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  }, [value]);

  // Cierre al hacer click fuera y con la tecla Escape mientras esta abierto.
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const today = new Date();

  // Construye las celdas del mes: huecos iniciales + dias del mes.
  const firstOfMonth = new Date(view.getFullYear(), view.getMonth(), 1);
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const leadingBlanks = mondayIndex(firstOfMonth);
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d));

  // Texto del trigger: fecha en DD/MM/YYYY o placeholder.
  const label = selected
    ? `${String(selected.getDate()).padStart(2, '0')}/${String(selected.getMonth() + 1).padStart(2, '0')}/${selected.getFullYear()}`
    : placeholder;

  const goPrev = () => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1));
  const goNext = () => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1));

  // Selecciona un dia: emite YYYY-MM-DD y cierra el popover.
  const pick = (d: Date) => {
    onChange(toISO(d));
    setOpen(false);
  };

  // "Hoy": selecciona la fecha actual. "Limpiar": vacia el value.
  const pickToday = () => pick(new Date());
  const clear = () => {
    onChange('');
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* Trigger con el mismo estilo que Input. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-left flex items-center justify-between gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <span className={selected ? 'text-text' : 'text-text-muted'}>{label}</span>
        <Calendar size={18} strokeWidth={1.75} className="text-text-muted shrink-0" />
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute z-50 mt-1 bg-surface border border-border rounded-xl shadow-xl p-3 w-72">
          {/* Encabezado: navegacion de meses + mes y ano. */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Mes anterior"
              className="text-text-muted hover:text-text transition rounded-lg p-1">
              <ChevronLeft size={18} strokeWidth={1.75} />
            </button>
            <span className="font-heading font-bold text-sm text-text">
              {MONTHS[view.getMonth()]} {view.getFullYear()}
            </span>
            <button
              type="button"
              onClick={goNext}
              aria-label="Mes siguiente"
              className="text-text-muted hover:text-text transition rounded-lg p-1">
              <ChevronRight size={18} strokeWidth={1.75} />
            </button>
          </div>

          {/* Fila de dias de la semana. */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-text-muted text-xs text-center py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Grilla de dias del mes. */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={`blank-${i}`} />;
              const isSelected = selected ? sameDay(d, selected) : false;
              const isToday = sameDay(d, today);
              // Seleccionado: relleno acento. Hoy (sin seleccion): borde sutil.
              const cls = isSelected
                ? 'bg-accent-fill text-accent-contrast'
                : isToday
                  ? 'border border-accent text-text hover:bg-surface-alt'
                  : 'text-text hover:bg-surface-alt';
              return (
                <button
                  key={toISO(d)}
                  type="button"
                  onClick={() => pick(d)}
                  className={`h-8 rounded-lg text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${cls}`}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Pie: acciones rapidas. */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={pickToday}
              className="text-accent text-sm font-semibold hover:brightness-95 transition">
              Hoy
            </button>
            <button
              type="button"
              onClick={clear}
              className="text-accent text-sm font-semibold hover:brightness-95 transition">
              Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
