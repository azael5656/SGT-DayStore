import api from '../api/client';
import type { ConfirmFn } from '../components/ui/ConfirmProvider';

interface ClienteRef {
  id: string;
  nombre: string;
}

interface PendingDebtsPayload {
  code?: string;
  cantidad?: number;
  totalUsd?: string;
  message?: string | string[];
}

/**
 * Flujo unificado para desactivar un cliente desde cualquier página.
 *
 * 1. Pide confirmación con el diálogo estilizado (`confirm`).
 * 2. Llama al backend. Si 200, ejecuta `onSuccess`.
 * 3. Si responde 409 con `code: 'CLIENT_HAS_PENDING_DEBTS'`, muestra un
 *    segundo confirm con cifras y ofrece anular las ventas pendientes.
 * 4. Si el usuario acepta, reintenta con `cancelDebts: true`.
 *
 * Cualquier otro error se muestra con `alert`.
 */
export async function pedirConfirmacionYDesactivar(
  cliente: ClienteRef,
  confirm: ConfirmFn,
  onSuccess: () => void,
): Promise<void> {
  const ok = await confirm({
    title: 'Desactivar cliente',
    message: `¿Desactivar a ${cliente.nombre}?`,
    confirmText: 'Desactivar',
    danger: true,
  });
  if (!ok) return;
  await intentarDesactivar(cliente, false, confirm, onSuccess);
}

async function intentarDesactivar(
  cliente: ClienteRef,
  cancelDebts: boolean,
  confirm: ConfirmFn,
  onSuccess: () => void,
): Promise<void> {
  try {
    await api.delete(`/api/negocio/customers/${cliente.id}`, {
      params: cancelDebts ? { cancelDebts: 'true' } : {},
    });
    onSuccess();
  } catch (err) {
    const e = err as {
      response?: { status?: number; data?: PendingDebtsPayload };
    };
    const data = e.response?.data;
    if (
      e.response?.status === 409 &&
      data?.code === 'CLIENT_HAS_PENDING_DEBTS' &&
      !cancelDebts
    ) {
      const ok = await confirm({
        title: 'Desactivar cliente',
        message: `${cliente.nombre} tiene ${data.cantidad ?? '?'} venta(s) pendiente(s) por $${data.totalUsd ?? '?'}.\n\nAl desactivar se anularán esas ventas y quedarán como pérdida en auditoría. ¿Continuar?`,
        confirmText: 'Anular y desactivar',
        danger: true,
      });
      if (ok) await intentarDesactivar(cliente, true, confirm, onSuccess);
      return;
    }
    const msg =
      typeof data?.message === 'string'
        ? data.message
        : Array.isArray(data?.message)
          ? data.message.join(', ')
          : 'No se pudo desactivar';
    alert(msg);
  }
}
