/**
 * Filtro de alertas por rol:
 *  - vendedor: solo incendio + forzado (lo que afecta productos y vitrinas)
 *  - admin/superadmin: todas
 */
export function alertaVisibleParaRol(
  tipoAlerta: string,
  role: string | undefined,
): boolean {
  if (!role) return false;
  if (role === 'admin' || role === 'superadmin') return true;
  return tipoAlerta === 'incendio' || tipoAlerta === 'forzado';
}

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

/**
 * Etiqueta legible para el `tipo` de una alerta (el badge de AlertasPage).
 * Sin entrada en el mapa, devuelve el tipo crudo (sigue siendo informativo).
 */
export function labelTipoAlerta(tipo: string): string {
  const map: Record<string, string> = {
    incendio: 'Incendio',
    forzado: 'Intento de forzado',
    corte_luz: 'Corte de energia',
    movimiento: 'Movimiento sospechoso',
    puerta_fuera_horario: 'Santa maria fuera de horario',
    calor_peligroso: 'Calor peligroso',
    alta_temperatura: 'Temperatura alta',
    alta_humedad: 'Humedad alta',
    sensor_desconectado: 'Sensor desconectado',
  };
  return map[tipo] ?? tipo;
}

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
  if (verbos[verbo]) return `${verbos[verbo]} ${recursos[recurso] ?? recurso}`;
  return action;
}

/**
 * Nombre legible del `resource` de un evento de auditoría (la columna Recurso).
 * Sin entrada en el mapa, devuelve el valor crudo.
 */
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
