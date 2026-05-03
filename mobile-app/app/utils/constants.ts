/**
 * Constantes globales de la app.
 * Agrupa URLs, nombres de rutas y colores del tema.
 */

/**
 * URL base del API. Apunta al nginx que enruta a ambos backends.
 *
 * TODO: extraer a variable de entorno con react-native-config o
 * pasarla por prop al bootstrap para distinguir dev / staging / prod.
 *
 * Notas importantes:
 *  - En emulador Android, "localhost" NO es tu PC: es el propio emulador.
 *    Usa 10.0.2.2 para alcanzar tu PC.
 *  - En device fisico conectado por USB usa la IP local de tu PC
 *    (ej. 192.168.1.50).
 */
/**
 * Para ver la app desde un telefono FISICO conectado a la misma red WiFi
 * que tu PC: usa la IP LAN de tu PC (la que sale en `ipconfig` como
 * "Wi-Fi IPv4 Address"). Ej: 'http://192.168.0.103:80'.
 *
 * Para emulador Android Studio: 'http://10.0.2.2:80' (reserva especial).
 *
 * Cambia esto y recompila. Si el WiFi de tu PC cambia de red, la IP cambia.
 */
/**
 * Para emulador Android Studio: usar `10.0.2.2:80` (alias especial al host).
 * Para teléfono físico en la misma WiFi: cambiar a la IP LAN (ej. http://192.168.0.100:80).
 */
export const API_BASE_URL = 'http://10.0.2.2:80';

/**
 * Nombres de las rutas de navegacion. Los usamos para navegar de forma
 * tipada y evitar typos con strings sueltas.
 */
export const ROUTES = {
  // Auth stack
  Login: 'Login',
  Register: 'Register',

  // Main tabs
  Dashboard: 'Dashboard',
  Inventario: 'Inventario',
  Ventas: 'Ventas',
  Alertas: 'Alertas',
  Auditoria: 'Auditoria',
  Historico: 'Historico',
  Usuarios: 'Usuarios',
  Perfil: 'Perfil',
} as const;

/**
 * Paleta de colores del tema.
 * TODO: acordar paleta final con el diseñador.
 */
export const COLORS = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
};

/**
 * Claves con las que guardamos datos en AsyncStorage. Se centralizan aqui
 * para no tener strings magicas repartidas por todo el codigo.
 */
export const STORAGE_KEYS = {
  accessToken: '@daystore/access_token',
  refreshToken: '@daystore/refresh_token',
  user: '@daystore/user',
};
