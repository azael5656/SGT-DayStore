# DaystoreApp - App movil (Android)

App movil de Daystore (React Native bare, **solo Android**) para:
- Ventas de inventario
- Gestion de productos y categorias
- Dashboard de monitoreo IoT en tiempo real
- Alertas y notificaciones de sensores
- Auditoria (solo dueño)

---

## Requisitos previos

1. **Node.js 18 o superior** (`node -v`).
2. **Android Studio instalado** con:
   - SDK Platform 34 (Android 14)
   - SDK Build-Tools 34.0.0
   - Android SDK Platform-Tools
   - Al menos un emulador (AVD) creado O un dispositivo fisico con
     "Depuracion USB" activada.
3. **Variables de entorno** (Windows):
   - `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`
   - Agregar a `Path`:
     - `%ANDROID_HOME%\platform-tools`
     - `%ANDROID_HOME%\emulator`
   - Reiniciar la terminal despues de configurarlas.
4. **JDK 17** (lo instala Android Studio). Verificar con `java -version`.

---

## Setup inicial (una sola vez)

### Paso 1: Generar la carpeta nativa `android/`

El CLI de React Native tiene un bug con `--directory .` en Windows, asi
que lo corremos aparte en una carpeta temporal y copiamos `android/`:

```bash
cd c:/Users/azael/Desktop/Proyecto-iot/proyecto

# Genera un proyecto RN temporal con la misma version que usamos aqui
npx @react-native-community/cli@15 init DaystoreApp --skip-install --version 0.76.5

# Movemos la carpeta android/ a mobile-app y borramos el temporal
mv DaystoreApp/android mobile-app/android
rm -rf DaystoreApp
```

### Paso 2: Instalar dependencias

```bash
cd mobile-app
npm install
```

### Paso 3: Configurar la URL del backend

Abre [app/utils/constants.ts](app/utils/constants.ts) y revisa `API_BASE_URL`:

- **Emulador de Android Studio**: `http://10.0.2.2:80` (valor por defecto).
  El emulador ve `10.0.2.2` como "tu PC".
- **Dispositivo fisico** conectado por USB o WiFi: usa la IP local de tu PC,
  por ejemplo `http://192.168.1.50:80`. Sacala con `ipconfig`.

---

## Correr la app en desarrollo

**Antes de arrancar la app**, los backends deben estar corriendo. Desde el
root del proyecto:

```bash
cd c:/Users/azael/Desktop/Proyecto-iot/proyecto
bash infra/scripts/generate-jwt-keys.sh   # solo la primera vez
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Luego, en **dos terminales separadas dentro de mobile-app/**:

```bash
# Terminal 1: arranca el bundler Metro
cd c:/Users/azael/Desktop/Proyecto-iot/proyecto/mobile-app
npm start

# Terminal 2: compila la app y la instala en el emulador/device
# (el emulador debe estar abierto o el device conectado antes)
cd c:/Users/azael/Desktop/Proyecto-iot/proyecto/mobile-app
npm run android
```

La primera compilacion tarda varios minutos (Gradle baja dependencias).
Las siguientes son rapidas.

---

## Como probar el flujo end-to-end

1. La app arranca → ves la pantalla de Login.
2. Mete cualquier email con `@` (por ejemplo `owner@daystore.co`) y una
   contraseña de 6+ caracteres. Por ahora el backend acepta cualquiera
   (los mocks del servicio), pero firma un JWT REAL con RS256.
3. Entras al dashboard con 5 tabs.
4. Cierras la app y la vuelves a abrir → entras directo a los tabs
   (el token quedo guardado en AsyncStorage).
5. Boton "Cerrar sesion" en cualquier tab te devuelve al Login.

Si el email contiene `owner` el rol sera `owner`, si no sera `employee`.
Asi puedes probar el RolesGuard sin tener BD todavia.

---

## Estructura

```
app/
  context/       AuthContext y AppContext (estado global)
  navigation/    Stack/Tab navigators
  screens/       Pantallas (Login, Register, Placeholder)
  services/      Cliente HTTP con interceptor de refresh (axios)
  utils/         Storage (AsyncStorage) y constantes
App.tsx          Componente raiz que envuelve todos los providers
index.js         Punto de entrada de RN (AppRegistry.registerComponent)
```

---

## Problemas comunes

**"Unable to load script"** al correr en device/emulador:

- Metro no esta corriendo. Abre otra terminal y `npm start`.

**"Connection refused" al hacer login**:

- Revisa `API_BASE_URL` en `constants.ts`. En emulador debe ser `10.0.2.2`,
  no `localhost`.
- Verifica que los backends esten arriba (`docker ps` o visita
  `http://localhost/api/negocio/health`).

**Gradle falla con "SDK location not found"**:

- Falta `ANDROID_HOME`. Crea `mobile-app/android/local.properties` con:

  ```properties
  sdk.dir=C\:\\Users\\<tu-usuario>\\AppData\\Local\\Android\\Sdk
  ```
