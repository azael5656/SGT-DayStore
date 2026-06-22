/**
 * Traducciones de identificadores tecnicos a texto legible para el usuario.
 * Centralizadas aqui para no repetirlas por toda la UI.
 */

export function saludoPorHora(fecha = new Date()): string {
  const h = fecha.getHours();
  if (h >= 5 && h < 12) return 'Buenos dias';
  if (h >= 12 && h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * Decide si un tipo de alerta es relevante para el rol del usuario.
 *
 * Vendedor: solo ve lo que afecta su trabajo directo:
 *  - incendio (productos se pueden arruinar)
 *  - forzado (santa maria abierta o vitrina golpeada)
 *
 * Admin / superadmin: ven todo (incluye movimiento fuera de horario,
 * cortes de luz, etc).
 */
export function alertaVisibleParaRol(
  tipoAlerta: string,
  role: string | undefined,
): boolean {
  if (!role) return false;
  if (role === 'admin' || role === 'superadmin') return true;
  return tipoAlerta === 'incendio' || tipoAlerta === 'forzado';
}

/** Traduce sensorId a etiqueta humana. */
export function labelSensor(sensorId: string): string {
  const map: Record<string, string> = {
    'dht22-ambiente': 'Ambiente de la tienda',
    'mc38-santa-maria': 'Santa maria del local',
    'sw420-vitrina-1': 'Vitrina 1 (golpe)',
    'sw420-vitrina-2': 'Vitrina 2 (golpe)',
    'pir-hcsr501-interior': 'Sensor de movimiento',
    'sct013-030-principal': 'Medidor de corriente',
    'buzzer-5v-principal': 'Alarma sonora',
  };
  return map[sensorId] ?? sensorId;
}

/** Label del tipo de sensor para mostrar en chips, grids, etc. */
export function labelTipo(tipo: string): string {
  const map: Record<string, string> = {
    temperatura: 'Temperatura',
    humedad: 'Humedad',
    puerta: 'Santa maria',
    movimiento: 'Movimiento',
    vibracion: 'Golpe en vitrina',
    corriente: 'Consumo electrico',
    buzzer: 'Alarma',
  };
  return map[tipo] ?? tipo;
}

/** Traduce acciones de auditoria (api.create, auth.login, etc.) a lenguaje humano. */
export function labelAccion(action: string): string {
  const map: Record<string, string> = {
    'auth.login': 'Inicio sesion',
    'products.create': 'Creo un producto',
    'products.update': 'Edito un producto',
    'products.delete': 'Elimino un producto',
    'categories.create': 'Creo una categoria',
    'categories.update': 'Edito una categoria',
    'categories.delete': 'Elimino una categoria',
    'customers.create': 'Registro un cliente',
    'customers.update': 'Edito un cliente',
    'customers.delete': 'Elimino un cliente',
    'users.create': 'Creo una cuenta de usuario',
    'users.update': 'Actualizo una cuenta',
    'users.delete': 'Elimino una cuenta',
    // El backend registra las ventas en singular (sale.*).
    'sale.create': 'Registro una venta',
    'sales.create': 'Registro una venta',
    'sale.abono': 'Registro un abono',
    'sale.cancel': 'Anulo una venta',
    'sale.delete': 'Elimino una venta',
    'sale.oversell': 'Venta sin stock (offline)',
    'exchange-rate.create': 'Subio una tasa de cambio',
    'exchange-rates.create': 'Subio una tasa de cambio',
    'alert.ack': 'Reconocio una alerta',
    'iot.scenario.run': 'Lanzo un escenario IoT',
    'alerts.update': 'Actualizo una alerta',
  };
  if (map[action]) return map[action];
  // Fallback: intentar humanizar `recurso.verbo`
  const [recurso, verbo] = action.split('.');
  const verbos: Record<string, string> = {
    create: 'creo',
    update: 'modifico',
    delete: 'elimino',
  };
  const recursos: Record<string, string> = {
    products: 'un producto',
    product: 'un producto',
    categories: 'una categoria',
    category: 'una categoria',
    customers: 'un cliente',
    users: 'un usuario',
    sales: 'una venta',
    sale: 'una venta',
    alerts: 'una alerta',
  };
  if (verbos[verbo]) {
    return `${verbos[verbo]} ${recursos[recurso] ?? recurso}`;
  }
  return action;
}

/** Nombre legible del `resource` de un evento de auditoria. */
export function labelRecurso(resource: string | null | undefined): string {
  if (!resource) return '-';
  const map: Record<string, string> = {
    sales: 'Ventas',
    sale: 'Ventas',
    products: 'Productos',
    product: 'Productos',
    categories: 'Categorias',
    category: 'Categorias',
    customers: 'Clientes',
    customer: 'Clientes',
    users: 'Usuarios',
    usuarios: 'Usuarios',
    'exchange-rates': 'Tasas de cambio',
    exchange_rates: 'Tasas de cambio',
    alerts: 'Alertas',
    simulator: 'Simulador IoT',
    'store-config': 'Configuracion de tienda',
    auth: 'Sesion',
  };
  return map[resource] ?? resource;
}
