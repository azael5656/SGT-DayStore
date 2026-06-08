import { LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { ROLE_VARIANT } from '../components/ui/variants';

export default function PerfilPage() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const rol = ROLE_VARIANT[user.role] ?? { tone: 'neutral' as const, label: user.role };

  return (
    <div className="max-w-md">
      <h1 className="font-heading text-2xl font-extrabold mb-6">Mi perfil</h1>
      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-accent-fill text-accent-contrast flex items-center justify-center text-2xl font-extrabold font-heading">
            {(user.nombre || user.email).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-lg text-text">{user.nombre || user.email}</div>
            <div className="text-sm text-text-muted">{user.email}</div>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <Row label="Rol">
            <Badge tone={rol.tone}>{rol.label ?? user.role}</Badge>
          </Row>
          <Row label="ID">{user.id}</Row>
        </div>

        <Button variant="danger" className="mt-6 w-full" leftIcon={<LogOut size={16} />} onClick={logout}>
          Cerrar sesion
        </Button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center border-b border-border pb-2 last:border-0">
      <span className="text-text-muted">{label}</span>
      <span className="text-text">{children}</span>
    </div>
  );
}
