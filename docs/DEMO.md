# Guia de presentacion — sensores simulados y escenarios

Esta guia describe como ejecutar una demostracion end-to-end del sistema
IoT sin necesidad de ESP32 fisico. Se apoya en dos piezas:

1. **MockPublisherService** (backend-iot): publica lecturas sinteticas por
   MQTT de forma continua cuando `MOCK_SENSORS=true`.
2. **SimulatorController** (backend-iot): tres endpoints HTTP que lanzan
   escenarios dramaticos durante la presentacion (incendio, forzado,
   normal). Cada escenario fuerza lecturas y genera alertas visibles
   inmediatamente en el movil.

Ambas piezas escriben al `InMemoryStoreService`, que TelemetryService y
AlertsService leen en vivo. No depende de Mongo — los datos se pierden
al reiniciar el backend.

## Preparacion (una sola vez)

```bash
# En la raiz del repo
cp .env.example .env
# En backend-iot
cp backend-iot/.env.example backend-iot/.env
# Activar el simulador en backend-iot/.env
#   MOCK_SENSORS=true

# Levantar infraestructura (Mosquitto, Postgres, Mongo, Redis, nginx)
docker compose -f docker-compose.dev.yml up -d

# Backend IoT
cd backend-iot && npm install && npm run start:dev
# (en otra terminal)
# Backend Negocio
cd backend-negocio && npm install && npm run start:dev
# (en otra terminal)
# Mobile
cd mobile-app && npm install && npm start
# Luego en otra terminal: npx react-native run-android
```

> Verifica que en los logs de **backend-iot** aparezca
> `Simulador de sensores ACTIVO (MOCK_SENSORS=true). Publicando a tienda/#`
> y que `MqttService` diga `Conectado al broker MQTT: mqtt://...`.

## Flujo de la demo

### 1. Login (backend-negocio)

En el emulador, pantalla de login:

- Email: `owner@daystore.local`
- Contrasena: `123456`

> Cualquier email con "owner" y password >= 6 caracteres pasa la
> validacion mock actual del backend-negocio (ver `auth.service.ts`,
> pendiente de implementar bcrypt real).

La app entra a los tabs.

### 2. Estado normal

Tab **Dashboard** muestra:

- Temperatura oscilando alrededor de 22-26 C.
- Puerta mayormente cerrada.
- Movimiento tranquilo.

Los valores se refrescan cada 5 s porque el MockPublisher sigue corriendo.

### 3. Escenario: INCENDIO

En una terminal (en la PC de la demo):

```bash
curl -X POST http://localhost:3002/api/iot/simulator/escenario/incendio
```

Inmediatamente en el emulador:

- Tab **Dashboard**: temperatura salta a ~38-42 C en rojo.
- Tab **Alertas**: aparece alerta `CRITICA` "Temperatura critica XX°C —
  posible incendio".
- **El telefono vibra** con patron de 500 ms — no para hasta que toques
  "Reconocer" en la alerta.

### 4. Escenario: FORZADO

```bash
curl -X POST http://localhost:3002/api/iot/simulator/escenario/forzado
```

- Tab **Dashboard**: puerta abierta (rojo) + movimiento reciente
  (naranja).
- Tab **Alertas**: alerta `CRITICA` "Intento de forzado detectado".
- **Vibracion** hasta reconocer.

### 5. Volver a la normalidad

```bash
curl -X POST http://localhost:3002/api/iot/simulator/escenario/normal
```

- Temperatura y puerta vuelven a valores estables.
- Todas las alertas se limpian.
- La vibracion se detiene cuando AlertBanner se desmonta.

## Verificar desde el API (opcional)

```bash
# Login para obtener token
TOKEN=$(curl -s -X POST http://localhost:3001/api/negocio/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@daystore.local","password":"123456"}' \
  | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{console.log(JSON.parse(d).accessToken)})")

# Consultar telemetria y alertas
curl -H "Authorization: Bearer $TOKEN" http://localhost:3002/api/iot/telemetry/latest | jq
curl -H "Authorization: Bearer $TOKEN" http://localhost:3002/api/iot/telemetry/dashboard | jq
curl -H "Authorization: Bearer $TOKEN" http://localhost:3002/api/iot/alerts | jq
```

## Notas

- Los endpoints del simulador (`/api/iot/simulator/escenario/:nombre`)
  estan marcados `@Public()` para facilitar la demo con curl. Antes de
  produccion hay que retirar ese decorator o restringir con `@Roles('admin')`.
- `InMemoryStoreService` es explicitamente para dev/demo. Cuando el
  equipo implemente los schemas Mongo (`sensor-reading.schema.ts`,
  `alert.schema.ts`) y el handler de persistencia en `MqttService`, se
  podra retirar o mantener como cache.
- La validacion de password en `backend-negocio/src/auth/auth.service.ts`
  sigue siendo mock. Para demo sirve; para produccion hay que implementar
  bcrypt + seed de usuarios.
