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
    'users.create': 'Creo una cuenta de usuario',
    'users.update': 'Actualizo una cuenta',
    'users.delete': 'Elimino una cuenta',
    'sales.create': 'Registro una venta',
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
    categories: 'una categoria',
    users: 'un usuario',
    sales: 'una venta',
    alerts: 'una alerta',
  };
  if (verbos[verbo]) return `${verbos[verbo]} ${recursos[recurso] ?? recurso}`;
  return action;
}
