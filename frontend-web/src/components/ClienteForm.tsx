import { FormEvent, useState } from 'react';
import api from '../api/client';
import type { Customer } from '../types';

const inputCls =
  'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

interface Props {
  cliente: Customer | null;
  onCerrar: () => void;
  onGuardado: (c: Customer) => void;
}

/**
 * Modal de creación/edición de cliente. Se monta como overlay.
 * Reusable desde la lista (`ClientesPage`) y el detalle (`ClienteDetallePage`).
 */
export default function ClienteForm({ cliente, onCerrar, onGuardado }: Props) {
  const [cedula, setCedula] = useState(cliente?.cedula ?? '');
  const [nombre, setNombre] = useState(cliente?.nombre ?? '');
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '');
  const [email, setEmail] = useState(cliente?.email ?? '');
  const [notas, setNotas] = useState(cliente?.notas ?? '');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const payload = {
        cedula: cedula.trim(),
        nombre: nombre.trim(),
        telefono: telefono.trim() || undefined,
        email: email.trim() || undefined,
        notas: notas.trim() || undefined,
      };
      const resp = cliente
        ? await api.patch<Customer>(`/api/negocio/customers/${cliente.id}`, payload)
        : await api.post<Customer>('/api/negocio/customers', payload);
      onGuardado(resp.data);
    } catch (err) {
      const e2 = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e2.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(', ') : msg ?? 'Error guardando',
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">
          {cliente ? 'Editar cliente' : 'Nuevo cliente'}
        </h3>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2 mb-3">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <Field label="Cédula *">
            <input
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="V-12345678"
              className={inputCls}
              required
            />
          </Field>
          <Field label="Nombre *">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputCls}
              required
            />
          </Field>
          <Field label="Teléfono">
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="04141234567"
              className={inputCls}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Notas">
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className={inputCls + ' min-h-[60px]'}
              maxLength={500}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="px-5 py-2 bg-primary text-white rounded-md text-sm font-semibold disabled:opacity-60">
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-600 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
