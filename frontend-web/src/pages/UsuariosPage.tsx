import { FormEvent, useEffect, useState } from 'react';
import api from '../api/client';
import type { Role, User } from '../types';

const ROLE_BADGE: Record<Role, string> = {
  superadmin: 'bg-purple-100 text-purple-700 border-purple-300',
  admin: 'bg-blue-100 text-blue-700 border-blue-300',
  vendedor: 'bg-cyan-100 text-cyan-700 border-cyan-300',
};

export default function UsuariosPage() {
  const [items, setItems] = useState<(User & { activo: boolean; createdAt: string })[]>([]);
  const [creando, setCreando] = useState(false);
  const [cargando, setCargando] = useState(false);

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
    if (!confirm('¿Desactivar este usuario?')) return;
    await api.patch(`/api/negocio/users/${id}/desactivar`);
    cargar();
  };

  const activar = async (id: string) => {
    await api.patch(`/api/negocio/users/${id}/activar`);
    cargar();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <button
          onClick={() => setCreando(true)}
          className="bg-primary text-white px-4 py-2 rounded-md text-sm font-semibold">
          + Nuevo usuario
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            )}
            {items.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2 font-medium">{u.nombre}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">
                  <select
                    value={u.role}
                    onChange={(e) => cambiarRol(u.id, e.target.value as Role)}
                    className={`text-xs font-semibold px-2 py-1 rounded border ${ROLE_BADGE[u.role]}`}>
                    <option value="superadmin">superadmin</option>
                    <option value="admin">admin</option>
                    <option value="vendedor">vendedor</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md ${
                      u.activo
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                    {u.activo ? 'activo' : 'inactivo'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  {u.activo ? (
                    <button
                      onClick={() => desactivar(u.id)}
                      className="text-red-600 text-xs hover:underline">
                      Desactivar
                    </button>
                  ) : (
                    <button
                      onClick={() => activar(u.id)}
                      className="text-green-600 text-xs hover:underline">
                      Activar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-bold mb-4">Nuevo usuario</h3>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2 mb-3">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="Contrasena (min 6)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            required
            minLength={6}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="vendedor">vendedor</option>
            <option value="admin">admin</option>
            <option value="superadmin">superadmin</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-semibold disabled:opacity-60">
            {guardando ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </form>
    </div>
  );
}
