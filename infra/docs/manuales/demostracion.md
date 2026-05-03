# DayIsaacStore — Guía de demo

Documento único para arrancar, actualizar y probar el proyecto end‑to‑end.

## Cuentas demo

| Rol          | Email                        | Contraseña  | Qué puede ver                                                                  |
|--------------|------------------------------|-------------|--------------------------------------------------------------------------------|
| Super admin  | `super@daystore.local`       | `super1234` | Todo: IoT, inventario, ventas, alertas, auditoría, histórico, usuarios, config |
| Administrador| `owner@daystore.local`       | `123456`    | Todo menos gestión de super admins                                             |
| Vendedor     | `vendedor@daystore.local`    | `123456`    | Home, inventario (lectura), ventas, alertas, perfil                            |

Se crean con `npm run seed:users`. El super admin es único: solo puede existir uno activo.

---

## Arranque desde cero

Asume Docker Desktop, Node 20+, Android Studio (para el emulador) y `adb` en PATH.

```bash
cd C:/dev/daystore/proyecto

# 1) Copiar .env
cp .env.example .env    # o edita .env si ya existe

# 2) Generar llaves JWT si nunca lo has hecho
bash infra/scripts/generate-jwt-keys.sh

# 3) Levantar backend + Mongo + Postgres + Redis + nginx + Mosquitto
docker compose up -d

# 4) Sembrar datos
docker compose exec -T backend-negocio node dist/seeds/seed-users.js
docker compose exec -T backend-negocio node dist/seeds/seed-inventario.js

# 5) Mobile (Metro + emulador)
cd c:/dev/daystore/proyecto/mobile-app
npm start -- --reset-cache &
npm run android

# 6) Web (admin panel)
cd ../frontend-web
npm install
npm run dev
# abrir http://localhost:5173
```

---

## Actualizar tras cambios (flujo diario)

```bash
# 1) Pull de la rama
cd C:/dev/daystore/proyecto
git pull

# 2) Reconstruir lo que cambió
docker compose build backend-iot backend-negocio
docker compose up -d --force-recreate backend-iot backend-negocio

# 3) Seed solo si el schema cambió
docker compose exec -T backend-negocio node dist/seeds/seed-users.js

# 4a) Mobile: si cambió solo TS/JSX — basta con reset de Metro
cd mobile-app
adb shell am force-stop com.daystoreapp
npx react-native start --reset-cache &
adb shell am start -n com.daystoreapp/.MainActivity

# 4b) Mobile: si cambió algo NATIVO (libs nuevas, permisos, archivos en res/) — rebuild APK
cd mobile-app/android
./gradlew assembleDebug --no-daemon --project-cache-dir=C:/gc
adb -s emulator-5554 install -r app/build/outputs/apk/debug/app-debug.apk
# para teléfono físico (ajusta el serial, ej. adb devices para verlo):
adb -s <serial> install -r app/build/outputs/apk/debug/app-debug.apk

# 5) Web: Vite tiene HMR; si algo se congela, reinicia:
cd frontend-web
npm run dev
```

---

## APK release para teléfono físico

```bash
# 1) Cambiar IP en mobile-app/app/utils/constants.ts
# API_BASE_URL = 'http://<IP-LAN-de-tu-PC>:80'
# (obtén la IP con `ipconfig` → Wi-Fi IPv4 Address)

# 2) Abrir firewall Windows (PowerShell Admin)
# New-NetFirewallRule -DisplayName "DayStore nginx 80" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# 3) Build release (~5-8 min en Windows)
cd mobile-app/android
./gradlew assembleRelease --no-daemon --project-cache-dir=C:/gc

# 4) APK queda en:
# mobile-app/android/app/build/outputs/apk/release/app-release.apk

# 5) Instalar en el teléfono (USB debugging activado):
adb -s <serial-tel> install -r app/build/outputs/apk/release/app-release.apk

# O copiar el APK a Drive / WhatsApp y abrir desde el teléfono.
```

Teléfono y PC deben estar en la **misma red WiFi** sin aislamiento de clientes.

---

## Compañero sin Android Studio: instalar el APK directo en el celular

Para quien tiene problemas con Android Studio (o no lo quiere instalar). Solo necesitas un APK ya compilado y un teléfono Android. **No instalas SDK, no instalas emulador, no compilas.**

### Lo que pides al equipo

- Archivo `app-debug.apk` (lo manda quien sí tiene el entorno completo, por WhatsApp / Drive / USB).
- IP local de la PC que va a correr el backend (`ipconfig` → Wi-Fi IPv4, ej. `192.168.0.103`).
- Esa IP **debe estar quemada en el APK** que te mandan. Si el APK trae otra IP o `10.0.2.2`, no conecta. Pídele a quien compile que edite [mobile-app/app/utils/constants.ts:27](../mobile-app/app/utils/constants.ts#L27) con la IP correcta antes de hacer `assembleDebug`.

### Preparar el teléfono (una sola vez)

1. Ajustes → Seguridad / Privacidad → activar **"Instalar apps desconocidas"** para el navegador / WhatsApp / Drive (la app desde la que vas a abrir el `.apk`).
2. Si Play Protect bloquea al instalar: **"Instalar de todos modos"**. El APK debug está firmado con keystore de desarrollo, no con uno de Play Store.
3. Misma WiFi que el backend, sin aislamiento de clientes (las redes de oficina o WiFi públicas suelen bloquear).

### Instalar el APK

**Opción A — sin PC (la más sencilla):**

1. Recibe el `.apk` por WhatsApp / Drive / correo / cable USB.
2. Tócalo desde el administrador de archivos o la app de descargas.
3. "Instalar". Si avisa "App no segura" → **Instalar de todos modos**.

**Opción B — con PC y `adb` (si ya tienes Platform Tools):**

```bash
adb devices                                # debe listar el teléfono
adb install -r ruta/al/app-debug.apk
```

Si solo necesitas `adb` y no quieres todo Android Studio: descarga **Android Platform Tools** (zip) desde [developer.android.com/tools/releases/platform-tools](https://developer.android.com/tools/releases/platform-tools), descomprime y mete la carpeta al PATH. Pesa ~15 MB.

### Levantar el backend en otra PC del equipo

Si tu PC es la que va a hostear el backend para que un compañero lo consuma desde el celular:

1. Docker Desktop + Node 20+ instalados (Android Studio **no** hace falta para esto).
2. Sigue **Arranque desde cero** de arriba, saltando los pasos 5 y 6 (Mobile y Web). Solo necesitas:

   ```bash
   cp .env.example .env
   bash infra/scripts/generate-jwt-keys.sh
   docker compose up -d
   docker compose exec -T backend-negocio node dist/seeds/seed-users.js
   docker compose exec -T backend-negocio node dist/seeds/seed-inventario.js
   ```

3. Saca tu IPv4 de la WiFi: `ipconfig` → busca **Adaptador de LAN inalámbrica Wi-Fi** → "Dirección IPv4".
4. Abrir el firewall en el puerto 80 (PowerShell como **Admin**):

   ```powershell
   New-NetFirewallRule -DisplayName "DayStore nginx 80" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
   ```

5. Test desde el navegador del **teléfono**: `http://<tu-IP>:80/health` → debe responder `{"status":"ok","service":"gateway"}`. Si esto falla, no es problema de la app, es firewall o aislamiento de WiFi.
6. Pásale tu IP al compañero que va a generar el APK; él edita `constants.ts` con esa IP, compila y te manda el `.apk`.

### Verificar que quedó bien instalado

1. Abre la app **DayStore** en el celular.
2. Login con `vendedor@daystore.local` / `123456`.
3. Si entra al Home → backend conecta, todo bien.
4. Si dice **"Error de red"** o se queda cargando, no es la app, es la red:
   - ¿Misma WiFi que la PC del backend?
   - ¿La IP dentro del APK es la actual de esa PC? (cambia si reconectas el WiFi).
   - ¿Firewall abierto en :80?
   - Test: abrir `http://<IP-backend>:80/health` desde el navegador del teléfono. Si esto no responde, la app tampoco lo va a hacer.

### Reinstalar / desinstalar

Si al instalar dice **"App no instalada"** o falla por firma diferente:

```bash
adb uninstall com.daystoreapp
```

O en el teléfono: Ajustes → Apps → DayStore → Desinstalar. Después reinstala el APK nuevo.

---

## Escenarios IoT (demo en vivo)

Los escenarios duran 15 s sosteniendo valores extremos. El buzzer suena y vibra en el móvil hasta que reconoces la alerta o pasa el timeout (20 s).

| Escenario     | Qué hace                                                                     | Comando                                                                    |
|---------------|------------------------------------------------------------------------------|----------------------------------------------------------------------------|
| Incendio      | Temperatura 38–42 °C durante 15 s + alerta crítica + buzzer                  | `curl.exe -X POST http://localhost/api/iot/simulator/escenario/incendio`   |
| Forzado       | Santa maría abierta + vibración en 2 vitrinas + movimiento + buzzer          | `curl.exe -X POST http://localhost/api/iot/simulator/escenario/forzado`    |
| Corte de luz  | Corriente cae a 0 W + buzzer + alerta crítica                                | `curl.exe -X POST http://localhost/api/iot/simulator/escenario/corte_luz`  |
| Normal        | Resetea todo: alertas limpiadas, buzzer apagado, sensores a estado seguro    | `curl.exe -X POST http://localhost/api/iot/simulator/escenario/normal`     |

> En Windows usa `curl.exe` explícitamente. `curl` a secas es alias de PowerShell `Invoke-WebRequest` y da error con `-X POST`.

Alerta tipo `movimiento` (severidad alta, **sin sonido**) se genera automáticamente si el PIR detecta algo con la tienda **cerrada** según `StoreConfig`.

---

## Sensores modelados

| Sensor físico               | Cantidad | Tipo de publicación                    | Estado por defecto |
|-----------------------------|----------|----------------------------------------|--------------------|
| DHT22 ambiente              | 1        | Continua (temp cada 2 s, hum cada 3 s) | 22 °C / 55 %       |
| MC-38 santa maría del local | 1        | Solo evento (al abrir/cerrar)          | cerrada            |
| SW-420 vitrinas             | 2        | Solo evento (intento de forzar)        | estable            |
| PIR HC-SR501 interior       | 1        | Solo fuera de horario                  | tranquilo          |
| SCT-013-030 corriente       | 1        | Continua cada 3 s                      | ~280 W             |
| Buzzer 5 V                  | 1        | Solo lo enciende un escenario          | silencio           |

---

## Configuración de la tienda (horario / vacaciones / cierre temprano)

Accesible desde móvil (Home → card **"Horario de la tienda"** si eres admin/superadmin) o con curl:

```bash
# Leer config actual
TOKEN=$(curl.exe -s -X POST http://localhost/api/negocio/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@daystore.local","password":"123456"}' | jq -r .accessToken)

curl.exe -s -H "Authorization: Bearer $TOKEN" http://localhost/api/iot/store/config

# ¿Abierta ahora?
curl.exe -s -H "Authorization: Bearer $TOKEN" http://localhost/api/iot/store/config/is-open

# Forzar modo nocturno (cualquier movimiento dispara alerta)
curl.exe -s -X PUT http://localhost/api/iot/store/config \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"modoNocturno":true}'

# Irme de vacaciones hasta el 25/04
curl.exe -s -X PUT http://localhost/api/iot/store/config \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"vacacionesHasta":"2026-04-25"}'

# Cerrar hoy temprano a las 16:00
curl.exe -s -X PUT http://localhost/api/iot/store/config \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"cerrarHoyA":"16:00"}'

# Domingo y lunes cerrado todo el día
curl.exe -s -X PUT http://localhost/api/iot/store/config \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"diasCerrados":[0,1]}'
```

Orden de evaluación para decidir "abierta ahora":

1. `modoNocturno === true` → cerrada
2. `vacacionesHasta >= hoy` → cerrada
3. `diaSemana` en `diasCerrados` → cerrada
4. `cerrarHoyA` seteado y hora actual ≥ `cerrarHoyA` → cerrada
5. Hora actual fuera de `horarioApertura`–`horarioCierre` → cerrada
6. En otro caso → abierta

Las comparaciones usan la `zonaHoraria` configurada (por defecto `America/Bogota`), no la hora del contenedor Docker.

---

## URLs útiles

| Servicio              | URL                                    |
|-----------------------|----------------------------------------|
| API gateway (nginx)   | `http://localhost` o `http://<IP-LAN>` |
| Web admin             | `http://localhost:5173`                |
| Metro (dev mobile)    | `http://localhost:8081`                |
| Mongo                 | `mongodb://localhost:27017/sgt_iot`    |
| Postgres              | `postgres://localhost:5432/sgt_daystore` |
| MQTT broker           | `mqtt://localhost:1883`                |

### Endpoints principales

| Método | Ruta                                              | Quién                    |
|--------|---------------------------------------------------|--------------------------|
| POST   | `/api/negocio/auth/login`                         | público                  |
| POST   | `/api/negocio/auth/refresh`                       | público                  |
| GET    | `/api/negocio/users`                              | admin, superadmin        |
| POST   | `/api/negocio/users`                              | admin (solo vendedor), super (cualquiera) |
| PATCH  | `/api/negocio/users/:id/role`                     | superadmin               |
| GET    | `/api/negocio/products`                           | autenticado              |
| POST   | `/api/negocio/products`                           | admin, superadmin        |
| GET    | `/api/negocio/audit/logs?page=1&limit=50`         | admin, superadmin        |
| GET    | `/api/iot/alerts`                                 | autenticado              |
| PUT    | `/api/iot/alerts/:id/acknowledge`                 | autenticado              |
| GET    | `/api/iot/telemetry/latest`                       | autenticado              |
| GET    | `/api/iot/sensors/readings/historico`             | admin, superadmin        |
| GET/PUT| `/api/iot/store/config`                           | GET: autenticado; PUT: admin/super |
| POST   | `/api/iot/simulator/escenario/{incendio\|forzado\|corte_luz\|normal}` | público (demo) |

### Socket.IO realtime

| Path        | Eventos del servidor → cliente                                          |
|-------------|-------------------------------------------------------------------------|
| `/socket.io`| `snapshot` (al conectar), `reading`, `alert`, `alert.ack`, `alerts.cleared` |

---

## Troubleshooting

| Síntoma                                              | Solución                                                               |
|------------------------------------------------------|------------------------------------------------------------------------|
| "Error de red" al login en teléfono físico           | Confirmar misma WiFi, firewall abierto en 80, `API_BASE_URL` correcto   |
| "Unable to resolve module" tras crear archivo nuevo  | `npx react-native start --reset-cache`                                  |
| Cambios backend no se reflejan                       | `docker compose up -d --force-recreate backend-iot`                     |
| Seed falla con "MODULE_NOT_FOUND"                    | Dockerfile es prod sin ts-node. Usa `node dist/seeds/seed-users.js`     |
| APK no instala por firma                             | `adb uninstall com.daystoreapp` y reinstala                             |
| Buzzer no suena (emulador)                           | Volumen "Media" subido. Móviles físicos suenan fuerte                   |
| Vite proxy 502                                       | Backend no corre: `docker compose ps` y levantar lo que falte           |
| Auditoría muestra `api.create` en vez de texto       | Actualizar al commit con `labelAccion()`                                |
| Alertas se apilan al lanzar `incendio` varias veces  | Dedupe por tipo activo; reconoce la alerta para empezar una nueva       |
| Temperatura cambia demasiado rápido                  | Esperado: drift 0.04 + ruido ±0.05 → cambios de ~0.05–0.2 °C cada 2 s   |

---

## Flujo de demo recomendado (10 min)

1. Abrir web `http://localhost:5173`, login con `super@`.
2. Enseñar Home hub con las métricas en vivo.
3. En móvil, login con `owner@`, mostrar tabs filtrados por rol.
4. `curl.exe -X POST http://localhost/api/iot/simulator/escenario/incendio` → alarma suena, vibra, banner rojo en Home, protocolo de emergencia.
5. Tocar "Marcar como revisada" → alarma para.
6. Abrir **Horario de la tienda** → cambiar a modo nocturno, enseñar que se evalúa contra zona horaria configurada.
7. Abrir Auditoría → ver el log humano ("owner Reconoció una alerta").
8. Abrir Histórico → ver tendencia de temperatura con sparkline.
9. Login en otro device con `vendedor@` → enseñar que NO ve tabs de admin.
