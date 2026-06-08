import { ReactNode, useState } from 'react';
import {
  BarChart3,
  BellRing,
  CircleUserRound,
  Clock,
  DollarSign,
  HandCoins,
  Home,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Menu,
  Package,
  ScrollText,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ThemeToggle } from '../theme/ThemeProvider';
import type { Role } from '../types';
import Badge from './ui/Badge';
import Logo from './ui/Logo';
import { ROLE_VARIANT } from './ui/variants';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    title: 'Principal',
    items: [
      { to: '/', label: 'Home', icon: Home },
      { to: '/reportes', label: 'Reportes', icon: BarChart3, roles: ['admin', 'superadmin'] },
      { to: '/dashboard-detalle', label: 'Dashboard IoT', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Operacion',
    items: [
      { to: '/inventario', label: 'Inventario', icon: Package },
      { to: '/ventas', label: 'Ventas', icon: ShoppingBag },
      { to: '/alertas', label: 'Alertas', icon: BellRing },
    ],
  },
  {
    title: 'Administracion',
    items: [
      { to: '/auditoria', label: 'Auditoria', icon: ScrollText, roles: ['admin', 'superadmin'] },
      { to: '/historico', label: 'Historico IoT', icon: TrendingUp, roles: ['admin', 'superadmin'] },
      { to: '/usuarios', label: 'Usuarios', icon: Users, roles: ['admin', 'superadmin'] },
      { to: '/horario-tienda', label: 'Horario tienda', icon: Clock, roles: ['admin', 'superadmin'] },
      { to: '/tasas', label: 'Tasas de cambio', icon: DollarSign, roles: ['admin', 'superadmin'] },
      { to: '/clientes', label: 'Clientes', icon: HandCoins, roles: ['admin', 'superadmin'] },
    ],
  },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return <>{children}</>;
  const rol = ROLE_VARIANT[user.role] ?? { tone: 'neutral' as const, label: user.role };

  return (
    <div className="flex h-screen w-full bg-bg text-text font-body">
      {/* Backdrop (solo movil, cuando el drawer esta abierto) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-60 bg-surface border-r border-border flex flex-col transition-transform duration-200 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="h-14 shrink-0 px-4 flex items-center gap-2.5 border-b border-border">
          <Logo size={30} />
          <div className="font-heading font-extrabold text-base leading-none truncate">
            Dayisaacstore
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {GROUPS.map((g) => {
            const visibles = g.items.filter((i) => !i.roles || i.roles.includes(user.role));
            if (visibles.length === 0) return null;
            return (
              <div key={g.title} className="mb-4">
                <div className="px-3 pb-1 text-[10px] uppercase font-bold tracking-wider text-text-muted">
                  {g.title}
                </div>
                {visibles.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${
                          isActive
                            ? 'bg-surface-alt text-accent font-semibold'
                            : 'text-text-muted hover:bg-surface-alt hover:text-text'
                        }`
                      }>
                      <Icon size={18} strokeWidth={1.75} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <button
            onClick={() => {
              setOpen(false);
              navigate('/perfil');
            }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-alt text-sm text-text-muted hover:text-text transition flex items-center gap-3">
            <CircleUserRound size={18} strokeWidth={1.75} />
            <span>Mi perfil</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 bg-surface border-b border-border flex items-center px-4 md:px-6 gap-3">
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            className="md:hidden p-2 -ml-2 rounded-lg text-text-muted hover:bg-surface-alt hover:text-text transition">
            <Menu size={20} strokeWidth={1.75} />
          </button>

          <div className="md:hidden flex items-center gap-2">
            <Logo size={28} />
            <span className="font-heading font-extrabold">Dayisaacstore</span>
          </div>

          <div className="flex-1" />

          <span className="hidden sm:inline-flex">
            <Badge tone={rol.tone}>{rol.label ?? user.role}</Badge>
          </span>
          <div className="text-sm text-right hidden sm:block">
            <div className="font-semibold leading-tight">{user.nombre || user.email}</div>
            <div className="text-xs text-text-muted">{user.email}</div>
          </div>
          <ThemeToggle />
          <button
            onClick={logout}
            className="text-sm text-danger hover:bg-surface-alt px-3 py-1.5 rounded-xl font-medium flex items-center gap-2 transition">
            <LogOut size={16} strokeWidth={1.75} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </header>

        <main className="flex-1 overflow-auto bg-bg p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
