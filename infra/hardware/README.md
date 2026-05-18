# Hardware IoT — SGT-Daystore

Documentación del firmware del ESP32 y conexión física de sensores para la
vitrina inteligente.

## Componentes en uso (sprint actual)

| Componente | Modelo | Cantidad | Pin ESP32 |
|---|---|---|---|
| Microcontrolador | ESP32 DevKit V1 (WROOM-32, USB-C) | 1 | — |
| Sensor ambiental | DHT22 | 1 | GPIO 4 |
| Alarma local | Buzzer activo 5V | 1 | GPIO 5 |

> El resto del hardware del proyecto (MC-38, SW-420, PIR, SCT-013-030) se
> integra en sprints posteriores. Ver `PROYECTO_COMPLETO_V3.md` § "Hardware IoT".

## Conexionado

```
DHT22                     ESP32
-----                     -----
VCC  -----------------> 3V3
GND  -----------------> GND
DATA -----[10kΩ pull-up a 3V3]----> GPIO 4

Buzzer activo 5V          ESP32
----------------          -----
(+) ------------------> GPIO 5
(-) ------------------> GND
```

Alimentación demo: powerbank USB-C al ESP32.

## Firmware

Archivo: `firmware/main.ino`

### Librerías (instalar desde el Library Manager del Arduino IDE)

- `WiFi` (incluida con el core de ESP32)
- `PubSubClient` — Nick O'Leary
- `DHT sensor library` — Adafruit
- `Adafruit Unified Sensor` — Adafruit (dependencia de la anterior)

### Antes de flashear, editar en `main.ino`:

```cpp
const char* WIFI_SSID     = "REEMPLAZAR_SSID";
const char* WIFI_PASSWORD = "REEMPLAZAR_PASSWORD";
const char* MQTT_HOST     = "192.168.1.100";   // IP LAN del laptop/VPS
const char* DEVICE_ID     = "esp32-vitrina-01";
```

### Compilar y subir

1. Arduino IDE → Tools → Board → **ESP32 Dev Module**
2. Tools → Port → puerto USB-C correspondiente
3. Verificar (✓) y subir (→).
4. Abrir Serial Monitor a **115200 baudios** para ver logs.

## Tópicos MQTT

| Dirección | Tópico | Payload | Frecuencia |
|---|---|---|---|
| ESP32 → broker | `tienda/ambiente/temperatura` | `<float>` (°C) | cada 5 s |
| ESP32 → broker | `tienda/ambiente/humedad` | `<float>` (%) | cada 5 s |
| ESP32 → broker | `tienda/sistema/status` | `online` / `offline` | heartbeat 15 s |
| broker → ESP32 | `tienda/comandos/buzzer` | `on` / `off` | bajo demanda |

El mensaje `offline` lo publica automáticamente el broker como *Last Will &
Testament* si el ESP32 pierde la conexión sin avisar.

## Lógica de respaldo offline

Toda la lógica de alertas vive en `backend-iot`. Sin embargo, si el ESP32
pierde WiFi o no logra conectar al broker, dispara localmente el buzzer cuando:

- Temperatura > **30 °C**, o
- Humedad > **70 %**

Esto evita que la vitrina quede sin alarma durante un corte de red.

## Pruebas rápidas

```bash
# Suscribirse a todos los tópicos del ESP32 (desde el laptop con Mosquitto)
mosquitto_sub -h localhost -t 'tienda/#' -v

# Forzar el buzzer encendido / apagado desde el laptop
mosquitto_pub -h localhost -t 'tienda/comandos/buzzer' -m 'on'
mosquitto_pub -h localhost -t 'tienda/comandos/buzzer' -m 'off'
```
