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

/** Traduce sensorId a etiqueta humana. */
export function labelSensor(sensorId: string): string {
  const map: Record<string, string> = {
    'dht22-ambiente': 'Sensor de ambiente',
    'mc38-entrada': 'Puerta del local',
    'mc38-vitrina-1': 'Vitrina 1',
    'mc38-vitrina-2': 'Vitrina 2',
    'mc38-vitrina-3': 'Vitrina 3',
    'mc38-vitrina-4': 'Vitrina 4',
    'sw420-vitrina-figuras-1': 'Vitrina de figuras (golpe)',
    'sw420-vitrina-figuras-2': 'Vitrina de figuras 2 (golpe)',
    'sw420-vitrina-figuras-3': 'Vitrina de figuras 3 (golpe)',
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
    puerta: 'Puerta',
    movimiento: 'Movimiento',
    vibracion: 'Vibracion en vitrina',
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
    'users.create': 'Creo una cuenta de usuario',
    'users.update': 'Actualizo una cuenta',
    'users.delete': 'Elimino una cuenta',
    'sales.create': 'Registro una venta',
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
    categories: 'una categoria',
    users: 'un usuario',
    sales: 'una venta',
    alerts: 'una alerta',
  };
  if (verbos[verbo]) {
    return `${verbos[verbo]} ${recursos[recurso] ?? recurso}`;
  }
  return action;
}
