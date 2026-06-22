/**
 * Notificaciones locales en la bandeja del celular (NOT-1).
 *
 * Usa @notifee/react-native, que es un MODULO NATIVO: para que funcione hay
 * que instalar la dependencia y RECOMPILAR la app (`npm install` +
 * `react-native run-android`), igual que con WatermelonDB.
 *
 * Todo el modulo esta blindado: el `require` y cada llamada van en try/catch.
 * Si el modulo nativo aun no esta compilado (o falla el permiso), las
 * funciones quedan en no-op y la app sigue funcionando sin romperse.
 */

// require dinamico: si el paquete/modulo nativo no esta, no truena el bundle.
// eslint-disable-next-line @typescript-eslint/no-var-requires
let notifee: any = null;
let AndroidImportance: any = { HIGH: 4 };
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@notifee/react-native');
  notifee = mod.default ?? mod;
  if (mod.AndroidImportance) AndroidImportance = mod.AndroidImportance;
} catch {
  notifee = null;
}

const CHANNEL_ID = 'alertas-daystore';
let canalListo = false;

/** ¿Esta disponible el modulo nativo de notificaciones? */
export function notificacionesDisponibles(): boolean {
  return !!notifee;
}

/**
 * Pide permiso (Android 13+) y crea el canal de notificaciones una vez.
 * Idempotente: se puede llamar varias veces sin efecto extra.
 */
export async function initLocalNotifications(): Promise<void> {
  if (!notifee) return;
  try {
    await notifee.requestPermission();
    if (!canalListo) {
      await notifee.createChannel({
        id: CHANNEL_ID,
        name: 'Alertas de la tienda',
        importance: AndroidImportance.HIGH,
        vibration: true,
      });
      canalListo = true;
    }
  } catch {
    /* sin permiso o sin modulo nativo: no-op */
  }
}

/**
 * Muestra una notificacion local en la bandeja del celular.
 * No-op silencioso si el modulo nativo no esta disponible.
 */
export async function notificarLocal(
  titulo: string,
  cuerpo: string,
): Promise<void> {
  if (!notifee) return;
  try {
    await initLocalNotifications();
    await notifee.displayNotification({
      title: titulo,
      body: cuerpo,
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
    });
  } catch {
    /* no-op */
  }
}

// Solo una notificacion de stock bajo por sesion de la app (evita spam al
// recargar el inventario varias veces).
let stockNotificado = false;

/**
 * Avisa una sola vez por sesion si hay productos en stock bajo/agotado.
 * No-op si la cantidad es 0 o si ya se aviso en esta sesion.
 */
export async function notificarStockBajoUnaVez(cantidad: number): Promise<void> {
  if (cantidad <= 0 || stockNotificado) return;
  stockNotificado = true;
  await notificarLocal(
    'Stock bajo',
    `Tienes ${cantidad} producto(s) en stock bajo o agotados. Revisa el inventario.`,
  );
}
