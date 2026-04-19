# SGT-Daystore

Sistema distribuido de gestión comercial y seguridad IoT con microservicios, persistencia políglota y app móvil offline-first para comercios de coleccionables.

## Arquitectura

- **backend-negocio** (NestJS + PostgreSQL): auth, productos, ventas, categorías, sync. Firma tokens JWT RS256.
- **backend-iot** (NestJS + MongoDB + Redis + MQTT): telemetría, sensores, alertas, notificaciones. Verifica tokens con llave pública.
- **mobile-app** (React Native 0.76.5): app Android offline-first.
- **nginx**: API gateway en `:80` que enruta `/api/negocio/*` y `/api/iot/*`.
- **mosquitto**: broker MQTT para sensores IoT.

## Requisitos

- Docker Desktop
- Node.js 20+
- JDK 17
- Android Studio con SDK + un AVD (Pixel 7 API 36 recomendado, mínimo 8GB de internal storage)
- Windows: seguir la sección [Windows: workaround de Gradle](#windows-workaround-de-gradle)

## Setup inicial (una sola vez)

### 1. Variables de entorno

```bash
cp .env.example .env
```

Los defaults sirven para desarrollo local. Si cambiaste los puertos en `.env`, ajusta también la `API_BASE_URL` en [mobile-app/app/utils/constants.ts](mobile-app/app/utils/constants.ts).

### 2. Generar llaves JWT RS256

```bash
bash infra/scripts/generate-jwt-keys.sh
```

Esto crea `infra/keys/jwt-private.pem` y `infra/keys/jwt-public.pem`. `backend-negocio` monta ambas (firma y verifica); `backend-iot` solo monta la pública.

## Correr el sistema completo

### Backends + infra (Docker)

Desde la raíz del proyecto:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Levanta: postgres, mongo, redis, mosquitto, backend-negocio (:3001), backend-iot (:3002), nginx (:80). Los backends corren con `npm run start:dev` (hot-reload).

Verifica que esté todo arriba:

```bash
docker compose ps
```

Smoke test:

```bash
curl http://localhost/health                 # gateway → {"status":"ok","service":"gateway"}
curl http://localhost/api/iot/health         # iot → {"status":"ok","mqtt_connected":true,...}
curl -o /dev/null -w "%{http_code}\n" http://localhost/api/negocio/auth/me   # 401 (guard activo)
```

Para parar todo:

```bash
docker compose down
```

### Mobile app (emulador Android)

1. Arranca el AVD desde Android Studio → Device Manager.
2. Verifica que ADB lo vea:

   ```bash
   adb devices
   ```

3. Arranca Metro en una terminal dedicada, desde `mobile-app/`:

   ```bash
   cd mobile-app
   npx react-native start
   ```

4. En otra terminal, instala la app en el emulador:

   **Windows** (ver workaround abajo):

   ```bash
   cd mobile-app/android
   ./gradlew app:installDebug -PreactNativeDevServerPort=8081 --no-daemon --project-cache-dir=C:\gc
   ```

   **macOS/Linux**:

   ```bash
   cd mobile-app
   npm run android
   ```

5. Lanza la app en el emulador:

   ```bash
   adb shell am start -n com.daystoreapp/.MainActivity
   ```

El emulador llega al host por `10.0.2.2`, así que la app habla con el gateway nginx en `http://10.0.2.2:80`.

## Generar APK para teléfono físico

### APK debug (rápido, para demos internas)

Desde `mobile-app/android/`:

**Windows**:

```bash
./gradlew assembleDebug --no-daemon --project-cache-dir=C:\gc
```

**macOS/Linux**:

```bash
./gradlew assembleDebug
```

La APK queda en:

```text
mobile-app/android/app/build/outputs/apk/debug/app-debug.apk
```

**Importante:** la APK debug asume que el teléfono puede alcanzar el backend. Opciones:

- **Misma Wi-Fi que tu PC**: edita [mobile-app/app/utils/constants.ts](mobile-app/app/utils/constants.ts) y cambia `API_BASE_URL` de `http://10.0.2.2:80` a `http://<IP-de-tu-PC>:80` (ej. `http://192.168.1.42:80`). Averigua la IP con `ipconfig` (Windows) o `ifconfig` (mac/linux). Luego recompila.
- **Backend público (tunnel)**: usa `ngrok http 80` y pon la URL del túnel en `API_BASE_URL`.

### Instalar la APK en el teléfono

1. Conecta el teléfono por USB con **depuración USB** activada (Ajustes → Opciones de desarrollador).
2. Verifica:

   ```bash
   adb devices
   ```

3. Instala:

   ```bash
   adb install -r mobile-app/android/app/build/outputs/apk/debug/app-debug.apk
   ```

O compartir el `.apk` directo (WhatsApp/Drive) y abrirlo en el teléfono con "Instalar apps desconocidas" habilitado para el navegador/app que uses para bajarlo.

### APK release (para producción)

La config actual de release en [mobile-app/android/app/build.gradle](mobile-app/android/app/build.gradle) reusa el keystore de debug — sirve para demos pero **no para publicar en Play Store**. Para producción:

1. Genera un keystore propio: `keytool -genkeypair -v -keystore release.keystore -alias daystore -keyalg RSA -keysize 2048 -validity 10000`
2. Reemplaza el `signingConfigs.release` en `build.gradle`.
3. Build:

   ```bash
   ./gradlew assembleRelease --no-daemon --project-cache-dir=C:\gc   # Windows
   ./gradlew assembleRelease                                          # macOS/Linux
   ```

La APK queda en `mobile-app/android/app/build/outputs/apk/release/app-release.apk`.

## Windows: workaround de Gradle

En Windows bajo rutas tipo `C:\dev\...`, los procesos de Windows Defender (`MsMpEng.exe`) y el indexador (`SearchIndexer.exe`) bloquean operaciones atómicas de Gradle y tiran el build con:

```text
java.io.UncheckedIOException: Could not move temporary workspace
```

Fix: siempre pasar `--no-daemon --project-cache-dir=C:\gc` al invocar `gradlew`. Crea la carpeta `C:\gc` una vez (`mkdir C:\gc`).

Config ya aplicada en [mobile-app/android/gradle.properties](mobile-app/android/gradle.properties):

```properties
org.gradle.vfs.watch=false
org.gradle.caching=false
org.gradle.parallel=false
```

## Versiones fijas (no usar `^`)

Con React Native 0.76.5, los siguientes paquetes nativos deben pinearse **sin caret** — versiones más nuevas rompen codegen/compileKotlin:

- `react-native-screens`: `4.4.0`
- `react-native-gesture-handler`: `2.21.2`
- `react-native-safe-area-context`: `4.14.0`
- `@react-native-async-storage/async-storage`: `2.1.0`

## Troubleshooting

| Síntoma | Causa probable | Fix |
| --- | --- | --- |
| `Error: Unknown prop type for "accessibilityContainerViewIsModal"` | `react-native-screens` actualizado a 4.24+ | Pinear a `4.4.0`, reinstalar |
| `Class 'ButtonViewGroup' is not abstract` en gesture-handler | Versión nueva que asume RN 0.77+ | Pinear a `2.21.2` |
| `Could not move temporary workspace` | Defender/SearchIndexer bloquean rename | Usar `--project-cache-dir=C:\gc --no-daemon` |
| `Requested internal only, but not enough space` al instalar | AVD con `/data` lleno | Crear AVD nuevo con más storage o `adb uninstall` apps que no uses |
| Metro da 500 `Unable to resolve module react-native` | Metro cacheando desde `node_modules` viejo | `npx react-native start --reset-cache` |
| App muestra pantalla roja "development server returned 500" | Metro muerto o con caché vieja | Matar proceso en puerto 8081 y reiniciar Metro |

## Estado actual del código

La rama `feat/architecture-setup` entrega el andamiaje completo: infra, gateway, guards, scaffolds de módulos, llaves JWT. La **lógica de negocio real** (login, registro, CRUD de productos, etc.) está marcada como `TODO` en los service files — se implementa en ramas siguientes.

Lo que sí funciona end-to-end: arranque de toda la infra, enrutado por gateway, validación de DTOs, guards rechazando 401, healthchecks, y la mobile-app renderizando la pantalla de login conectada al gateway.
