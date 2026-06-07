import { useAuth } from '../auth/AuthContext';
import type { Role } from '../types';

const ROLE_BADGE: Record<Role, { label: string; color: string }> = {
  superadmin: { label: 'SUPER ADMIN', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  admin: { label: 'ADMINISTRADOR', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  vendedor: { label: 'VENDEDOR', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
};

export default function PerfilPage() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const badge = ROLE_BADGE[user.role];

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold mb-6">Mi perfil</h1>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold">
            {(user.nombre || user.email).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-lg">{user.nombre || user.email}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <Row label="Rol">
            <span className={`text-xs font-bold px-2 py-1 rounded border ${badge.color}`}>
              {badge.label}
            </span>
          </Row>
          <Row label="ID">{user.id}</Row>
        </div>

        <button
          onClick={logout}
          className="mt-6 w-full bg-red-600 text-white rounded-md py-2.5 font-semibold hover:bg-red-700">
          🚪 Cerrar sesion
        </button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center border-b pb-2 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span>{children}</span>
    </div>
  );
}
