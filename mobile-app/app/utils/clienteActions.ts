import { Alert as RNAlert } from 'react-native';
import { customersService } from '../services/customers.service';
import { parseApiError } from './errors';

interface ClienteRef {
  id: string;
  nombre: string;
}

/**
 * Flujo unificado para desactivar un cliente desde cualquier pantalla.
 *
 * 1. Pide confirmacion al usuario.
 * 2. Llama al backend. Si responde 200, ejecuta `onSuccess`.
 * 3. Si responde 409 con `code: 'CLIENT_HAS_PENDING_DEBTS'`, muestra
 *    un segundo alert con las cifras (cantidad y monto en USD) y
 *    ofrece anular las ventas pendientes.
 * 4. Si el usuario acepta anular, reintenta con `cancelDebts: true`.
 *
 * Cualquier otro error se muestra con `parseApiError`.
 */
export function pedirConfirmacionYDesactivar(
  cliente: ClienteRef,
  onSuccess: () => void,
): void {
  RNAlert.alert(
    'Desactivar cliente',
    `¿Desactivar a ${cliente.nombre}?`,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí, desactivar',
        style: 'destructive',
        onPress: () => intentarDesactivar(cliente, false, onSuccess),
      },
    ],
  );
}

function intentarDesactivar(
  cliente: ClienteRef,
  cancelDebts: boolean,
  onSuccess: () => void,
): void {
  void (async () => {
    try {
      await customersService.desactivar(cliente.id, { cancelDebts });
      onSuccess();
    } catch (err) {
      const e = err as {
        response?: {
          status?: number;
          data?: {
            code?: string;
            cantidad?: number;
            totalUsd?: string;
          };
        };
      };
      const data = e.response?.data;
      if (
        e.response?.status === 409 &&
        data?.code === 'CLIENT_HAS_PENDING_DEBTS' &&
        !cancelDebts
      ) {
        RNAlert.alert(
          'Cliente con deudas',
          `${cliente.nombre} tiene ${data.cantidad ?? '?'} venta(s) pendiente(s) por $${data.totalUsd ?? '?'}.\n\nAl desactivar se anularán esas ventas y quedarán como pérdida en auditoría. ¿Continuar?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Anular y desactivar',
              style: 'destructive',
              onPress: () => intentarDesactivar(cliente, true, onSuccess),
            },
          ],
        );
        return;
      }
      RNAlert.alert('Error', parseApiError(err, 'No se pudo desactivar'));
    }
  })();
}
