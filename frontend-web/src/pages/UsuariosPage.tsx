import { FormEvent, useEffect, useState } from 'react';
import { Users, Plus } from 'lucide-react';
import api from '../api/client';
import type { Role, User } from '../types';
import { Table, THead, TBody, TR, TH, TD } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Field from '../components/ui/Field';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import PageHeader from '../components/ui/PageHeader';
import { useConfirm } from '../components/ui/ConfirmProvider';

export default function UsuariosPage() {
  const [items, setItems] = useState<(User & { activo: boolean; createdAt: string })[]>([]);
  const [creando, setCreando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const confirm = useConfirm();

  const cargar = async () => {
    setCargando(true);
    try {
      const { data } = await api.get('/api/negocio/users');
      setItems(data);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const cambiarRol = async (id: string, role: Role) => {
    await api.patch(`/api/negocio/users/${id}/role`, { role });
    cargar();
  };

  const desactivar = async (id: string) => {
    const ok = await confirm({
      title: 'Desactivar usuario',
      message: '¿Desactivar este usuario?',
      confirmText: 'Desactivar',
      danger: true,
    });
    if (!ok) return;
    await api.patch(`/api/negocio/users/${id}/desactivar`);
    cargar();
  };

  const activar = async (id: string) => {
    await api.patch(`/api/negocio/users/${id}/activar`);
    cargar();
  };

  return (
    <div>
      <PageHeader
        title="Usuarios"
        icon={<Users size={22} strokeWidth={1.75} />}
        actions={
          <Button onClick={() => setCreando(true)} leftIcon={<Plus size={16} strokeWidth={1.75} />}>
            Nuevo usuario
          </Button>
        }
      />

      <Table className="min-w-[600px]">
        <THead>
          <TR>
            <TH>Nombre</TH>
            <TH>Email</TH>
            <TH>Rol</TH>
            <TH>Estado</TH>
            <TH></TH>
          </TR>
        </THead>
        <TBody>
          {cargando && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                Cargando...
              </td>
            </tr>
          )}
          {items.map((u) => (
            <TR key={u.id}>
              <TD className="font-medium">{u.nombre}</TD>
              <TD>{u.email}</TD>
              <TD>
                <select
                  value={u.role}
                  onChange={(e) => cambiarRol(u.id, e.target.value as Role)}
                  className="text-xs font-semibold px-2 py-1 rounded-xl border border-border bg-bg text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <option value="superadmin">superadmin</option>
                  <option value="admin">admin</option>
                  <option value="vendedor">vendedor</option>
                </select>
              </TD>
              <TD>
                <Badge tone={u.activo ? 'success' : 'danger'}>
                  {u.activo ? 'activo' : 'inactivo'}
                </Badge>
              </TD>
              <TD className="text-right">
                {u.activo ? (
                  <Button variant="ghost" size="sm" onClick={() => desactivar(u.id)}>
                    Desactivar
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => activar(u.id)}>
                    Activar
                  </Button>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {creando && (
        <CrearUsuario
          onCerrar={() => setCreando(false)}
          onCreado={() => {
            setCreando(false);
            cargar();
          }}
        />
      )}
    </div>
  );
}

interface CrearProps {
  onCerrar: () => void;
  onCreado: () => void;
}

function CrearUsuario({ onCerrar, onCreado }: CrearProps) {
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('vendedor');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await api.post('/api/negocio/users', { email, nombre, password, role });
      onCreado();
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'No se pudo crear',
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal open onClose={onCerrar} title="Nuevo usuario" maxWidth="sm">
      <form onSubmit={submit}>
        {error && (
          <div className="mb-3">
            <Alert tone="danger">{error}</Alert>
          </div>
        )}
        <div className="space-y-3">
          <Input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
          <Input
            placeholder="Contrasena (min 6)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <Field>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <option value="vendedor">vendedor</option>
              <option value="admin">admin</option>
              <option value="superadmin">superadmin</option>
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Creando...' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
