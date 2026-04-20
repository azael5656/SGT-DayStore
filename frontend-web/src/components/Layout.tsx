import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: string;
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
      { to: '/', label: 'Home', icon: '🏠' },
      { to: '/dashboard-detalle', label: 'Dashboard IoT', icon: '📊' },
    ],
  },
  {
    title: 'Operacion',
    items: [
      { to: '/inventario', label: 'Inventario', icon: '📦' },
      { to: '/ventas', label: 'Ventas', icon: '💰' },
      { to: '/alertas', label: 'Alertas', icon: '🔔' },
    ],
  },
  {
    title: 'Administracion',
    items: [
      { to: '/auditoria', label: 'Auditoria', icon: '📋', roles: ['admin', 'superadmin'] },
      { to: '/historico', label: 'Historico IoT', icon: '📈', roles: ['admin', 'superadmin'] },
      { to: '/usuarios', label: 'Usuarios', icon: '👥', roles: ['admin', 'superadmin'] },
      { to: '/horario-tienda', label: 'Horario tienda', icon: '🕒', roles: ['admin', 'superadmin'] },
    ],
  },
];

const ROLE_BADGE: Record<Role, { label: string; color: string }> = {
  superadmin: { label: 'SUPER ADMIN', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  admin: { label: 'ADMINISTRADOR', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  vendedor: { label: 'VENDEDOR', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
};

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return <>{children}</>;
  const badge = ROLE_BADGE[user.role];

  return (
    <div className="flex h-screen w-full bg-gray-50 text-gray-900">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏪</span>
            <div>
              <div className="font-bold text-lg">DayStore</div>
              <div className="text-xs text-gray-500">Panel admin</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {GROUPS.map((g) => {
            const visibles = g.items.filter(
              (i) => !i.roles || i.roles.includes(user.role),
            );
            if (visibles.length === 0) return null;
            return (
              <div key={g.title} className="mb-4">
                <div className="px-3 pb-1 text-[10px] uppercase font-bold tracking-wider text-gray-400">
                  {g.title}
                </div>
                {visibles.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                        isActive
                          ? 'bg-blue-50 text-primary font-semibold'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }>
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200">
          <button
            onClick={() => navigate('/perfil')}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-sm flex items-center gap-3">
            <span className="text-lg">👤</span>
            <span>Mi perfil</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-end px-6 gap-4">
          <span className={`text-xs font-bold px-2 py-1 rounded-md border ${badge.color}`}>
            {badge.label}
          </span>
          <div className="text-sm">
            <div className="font-semibold">{user.nombre || user.email}</div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </div>
          <button
            onClick={logout}
            className="text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-md font-medium">
            🚪 Cerrar sesion
          </button>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
