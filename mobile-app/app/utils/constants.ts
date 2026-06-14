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
 * Conexión por túnel `adb reverse` (funciona igual en emulador y en teléfono
 * físico conectado por USB). El dispositivo abre localhost:8080 y adb lo
 * redirige al :80 del PC (nginx). Requiere, una sola vez por sesión de adb:
 *
 *   adb -s <serial> reverse tcp:8080 tcp:80
 *
 * Usamos 8080 (no 80) porque el adbd del emulador es "production build" y no
 * puede enlazar puertos privilegiados (<1024); 8080 lo enlazan ambos sin root.
 * El túnel se pierde si se reinicia el servidor adb o se desconecta el equipo.
 *
 * Alternativas si se necesita la app suelta (sin cable):
 *   - Emulador Android Studio: 'http://10.0.2.2:80' (alias especial al host).
 *   - Teléfono en la misma WiFi: la IP LAN del PC, ej. 'http://192.168.0.103:80'.
 *   - ZeroTier/VPN: IP estable alcanzable desde cualquier red.
 */
export const API_BASE_URL = 'http://localhost:8080';

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
  // Marca Dayisaacstore — paleta "Pizarra fria" (claro) + naranja del logo.
  primary: '#FF7A00',
  primaryDark: '#E06C00',
  background: '#F6F8FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF1F5',
  text: '#1A2129',
  textMuted: '#66707B',
  border: '#D9E0E7',
  success: '#16A34A',
  warning: '#B45309',
  danger: '#DC2626',
  info: '#0369A1',
  accentContrast: '#FFFFFF',
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
