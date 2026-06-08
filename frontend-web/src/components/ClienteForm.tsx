import { FormEvent, useState } from 'react';
import api from '../api/client';
import type { Customer } from '../types';
import Input from './ui/Input';
import Field from './ui/Field';
import Button from './ui/Button';
import Alert from './ui/Alert';

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
        className="bg-surface text-text border border-border rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="font-heading text-lg font-bold mb-4">
          {cliente ? 'Editar cliente' : 'Nuevo cliente'}
        </h3>
        {error && (
          <div className="mb-3">
            <Alert tone="danger">{error}</Alert>
          </div>
        )}
        <div className="space-y-3">
          <Field label="Cédula *">
            <Input
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="V-12345678"
              required
            />
          </Field>
          <Field label="Nombre *">
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </Field>
          <Field label="Teléfono">
            <Input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="04141234567"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Notas">
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-text placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent min-h-[60px]"
              maxLength={500}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button type="button" variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
