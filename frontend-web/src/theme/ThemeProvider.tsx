import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

// Clave de persistencia en localStorage (nombre de la tienda).
const STORAGE_KEY = 'dayisaacstore-theme';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Lee el tema guardado; default 'light' si no hay valor valido.
function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === 'dark' ? 'dark' : 'light';
}

interface ProviderProps {
  children: ReactNode;
}

/**
 * Maneja el modo claro/oscuro de toda la app. Aplica la clase 'dark' en
 * document.documentElement (darkMode:'class') y persiste la eleccion en
 * localStorage. Default: modo claro.
 */
export function ThemeProvider({ children }: ProviderProps) {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  // Sincroniza la clase 'dark' del <html> y guarda en localStorage.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Acceso al tema activo y a las acciones para cambiarlo. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}

interface ToggleProps {
  label?: string;
}

/**
 * Boton discreto para alternar el tema. Muestra Sun en oscuro (accion: ir a
 * claro) y Moon en claro (accion: ir a oscuro), con etiqueta opcional.
 */
export function ThemeToggle({ label }: ToggleProps) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  const Icon = isDark ? Sun : Moon;
  const text = label ?? (isDark ? 'Modo claro' : 'Modo oscuro');

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={text}
      title={text}
      className="inline-flex items-center gap-2 p-2 rounded-lg text-text-muted transition hover:bg-surface-alt hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
      <Icon size={18} strokeWidth={1.75} />
      {label && <span className="text-sm font-medium">{label}</span>}
    </button>
  );
}
