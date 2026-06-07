// =============================================================================
// SGT-Daystore  -  Firmware ESP32  (vitrina inteligente)
// -----------------------------------------------------------------------------
// Hardware:  ESP32 DevKit V1 (WROOM-32, USB-C)
//            DHT22  -> GPIO 4   (temperatura + humedad)
//            Buzzer -> GPIO 5   (activo, 5V)
//            MC-38  -> GPIO 23  (reed switch santa maria; el otro cable a GND)
//
// El ESP32 actua como publicador de datos crudos. Toda la logica de alertas
// vive en backend-iot. Si se cae la red, el firmware activa el buzzer local
// como respaldo para que la vitrina no quede sin alarma durante la demo.
//
// Librerias requeridas (Arduino IDE -> Library Manager):
//   - WiFi             (incluida con el core de ESP32)
//   - PubSubClient     by Nick O'Leary       (MQTT)
//   - DHT sensor library by Adafruit         (DHT22)
//   - Adafruit Unified Sensor                (dependencia de DHT)
//
// Topicos MQTT (definidos en PROYECTO_COMPLETO_V3.md):
//   PUBLISH -> tienda/ambiente/temperatura   payload: "<float>"  (°C)
//   PUBLISH -> tienda/ambiente/humedad       payload: "<float>"  (%)
//   PUBLISH -> tienda/seguridad/puerta       payload: "abierta" | "cerrada"
//   PUBLISH -> tienda/sistema/status         payload: "online" | "offline"
//   SUBSCRIBE <- tienda/comandos/buzzer      payload: "on" | "off"
// =============================================================================

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// -----------------------------------------------------------------------------
// Configuracion - editar antes de flashear
// -----------------------------------------------------------------------------
const char* WIFI_SSID     = "Redmi 14C";
const char* WIFI_PASSWORD = "1234567899";

// IP del PC/VPS donde corre Mosquitto. Para demo local con hotspot del celu,
// poner aqui la IP LAN del laptop que levanta docker-compose.
const char* MQTT_HOST = "10.147.200.40";
const int   MQTT_PORT = 1883;

// Identificador unico del dispositivo. Si se agregan mas ESP32, cambiar este
// valor para diferenciarlos en logs y en el campo metadata.deviceId.
const char* DEVICE_ID = "esp32-vitrina-01";

// -----------------------------------------------------------------------------
// Pines
// -----------------------------------------------------------------------------
#define PIN_DHT     4
#define PIN_BUZZER  5
#define PIN_PUERTA  23   // MC-38 reed switch (INPUT_PULLUP)
#define DHT_TYPE    DHT22

// -----------------------------------------------------------------------------
// Topicos MQTT
// -----------------------------------------------------------------------------
const char* TOPIC_TEMP      = "tienda/ambiente/temperatura";
const char* TOPIC_HUM       = "tienda/ambiente/humedad";
const char* TOPIC_PUERTA    = "tienda/seguridad/puerta";
const char* TOPIC_STATUS    = "tienda/sistema/status";
const char* TOPIC_CMD_BUZZ  = "tienda/comandos/buzzer";

// -----------------------------------------------------------------------------
// Intervalos (ms)
// -----------------------------------------------------------------------------
const unsigned long INTERVALO_LECTURA   = 5000;   // DHT22 cada 5s
const unsigned long INTERVALO_HEARTBEAT = 15000;  // status cada 15s
const unsigned long TIMEOUT_WIFI_MS     = 15000;  // reintento de WiFi

// Umbrales de seguridad locales (solo se usan si NO hay conexion al broker).
// Ajustados para Tachira: humedad ambiente normal 70-85%, asi que 70 era
// inutil (siempre sonaba). Estos son "ultima linea de defensa": solo
// disparan si la situacion es realmente anormal y no hay backend.
const float UMBRAL_TEMP_LOCAL = 32.0f;
const float UMBRAL_HUM_LOCAL  = 85.0f;  // 70 era inutil en Tachira (humedad normal 70-85%)

// -----------------------------------------------------------------------------
// Estado global
// -----------------------------------------------------------------------------
WiFiClient    wifiClient;
PubSubClient  mqttClient(wifiClient);
DHT           dht(PIN_DHT, DHT_TYPE);

unsigned long ultimaLectura   = 0;
unsigned long ultimoHeartbeat = 0;
bool          buzzerForzado   = false;  // ultimo comando recibido del backend
int           ultimoEstadoPuerta = -1;  // -1 = aun sin publicar (fuerza primer envio)

// -----------------------------------------------------------------------------
// Utilidades
// -----------------------------------------------------------------------------
void setBuzzer(bool on) {
  digitalWrite(PIN_BUZZER, on ? HIGH : LOW);
}

void conectarWifi() {
  Serial.printf("[WiFi] Conectando a %s...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < TIMEOUT_WIFI_MS) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] OK  ip=%s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] FALLO - se reintentara en el loop principal");
  }
}

// Callback que se ejecuta al recibir un mensaje en un topico suscrito.
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String msg;
  msg.reserve(length);
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];

  Serial.printf("[MQTT] %s <- %s\n", topic, msg.c_str());

  if (strcmp(topic, TOPIC_CMD_BUZZ) == 0) {
    if (msg == "on") {
      buzzerForzado = true;
      setBuzzer(true);
    } else if (msg == "off") {
      buzzerForzado = false;
      setBuzzer(false);
    }
  }
}

void conectarMqtt() {
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);

  while (!mqttClient.connected()) {
    Serial.printf("[MQTT] Conectando a %s:%d como %s ...\n",
                  MQTT_HOST, MQTT_PORT, DEVICE_ID);

    // LWT (Last Will & Testament): si el ESP32 se desconecta sin avisar,
    // el broker publica automaticamente "offline" en tienda/sistema/status.
    bool ok = mqttClient.connect(
      DEVICE_ID,
      nullptr, nullptr,           // user/pass anonimo
      TOPIC_STATUS, 0, true,      // willTopic, willQos, willRetain
      "offline"                   // willMessage
    );

    if (ok) {
      Serial.println("[MQTT] OK");
      mqttClient.publish(TOPIC_STATUS, "online", true);
      mqttClient.subscribe(TOPIC_CMD_BUZZ);
      publicarPuerta(true);  // estado actual de la santa maria al (re)conectar
    } else {
      Serial.printf("[MQTT] FALLO rc=%d - reintenta en 3s\n", mqttClient.state());
      delay(3000);
    }
  }
}

void publicarLectura() {
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("[DHT] Lectura invalida (NaN)");
    return;
  }

  char buf[16];

  dtostrf(temp, 0, 2, buf);
  mqttClient.publish(TOPIC_TEMP, buf);

  dtostrf(hum, 0, 2, buf);
  mqttClient.publish(TOPIC_HUM, buf);

  Serial.printf("[PUB] temp=%.2f°C  hum=%.2f%%\n", temp, hum);

  // Conectados: el buzzer lo gobierna SOLO el backend via
  // tienda/comandos/buzzer (ver onMqttMessage). No aplicamos umbrales
  // locales aqui a proposito: si lo hicieramos, la humedad normal de Tachira
  // (>70%) reactivaria el buzzer en cada lectura (cada 5s) peleando contra el
  // "off" que envia el backend al reconocer la alerta, y la alarma nunca se
  // apagaria. El respaldo por umbral local solo corre SIN conexion (ver loop()).
}

// MC-38 con INPUT_PULLUP: iman cerca (cerrada) = LOW; iman lejos (abierta) = HIGH.
// Publica con retain solo al cambiar de estado (o si force=true, p.ej. al
// reconectar) para no spamear el broker. El backend decide la alerta segun el
// horario de la tienda; el firmware solo reporta el estado crudo.
void publicarPuerta(bool force) {
  int estado = digitalRead(PIN_PUERTA);  // HIGH = abierta
  if (!force && estado == ultimoEstadoPuerta) return;
  ultimoEstadoPuerta = estado;
  const char* payload = (estado == HIGH) ? "abierta" : "cerrada";
  mqttClient.publish(TOPIC_PUERTA, payload, true);
  Serial.printf("[PUB] puerta=%s\n", payload);
}

void publicarHeartbeat() {
  mqttClient.publish(TOPIC_STATUS, "online", true);
  Serial.println("[HB] online");
}

// -----------------------------------------------------------------------------
// Arduino: setup / loop
// -----------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n=== SGT-Daystore ESP32 booting ===");

  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_PUERTA, INPUT_PULLUP);
  setBuzzer(false);

  dht.begin();
  conectarWifi();
}

void loop() {
  // 1. WiFi caido -> reintentar y, mientras tanto, aplicar logica local.
  if (WiFi.status() != WL_CONNECTED) {
    setBuzzer(false);  // limpia estado previo del backend
    conectarWifi();
    // En modo offline igual leemos DHT para poder alarmar localmente.
    if (millis() - ultimaLectura > INTERVALO_LECTURA) {
      ultimaLectura = millis();
      float temp = dht.readTemperature();
      float hum  = dht.readHumidity();
      if (!isnan(temp) && !isnan(hum)) {
        bool alarma = (temp > UMBRAL_TEMP_LOCAL) || (hum > UMBRAL_HUM_LOCAL);
        setBuzzer(alarma);
        Serial.printf("[OFFLINE] temp=%.2f hum=%.2f alarma=%d\n",
                      temp, hum, alarma);
      }
    }
    return;
  }

  // 2. MQTT caido -> reconectar (loop interno hasta lograrlo).
  if (!mqttClient.connected()) conectarMqtt();
  mqttClient.loop();

  // 3. Santa maria: revisar en cada vuelta para reaccionar al instante al
  //    abrir/cerrar (publica solo si cambio el estado).
  publicarPuerta(false);

  // 4. Publicacion periodica de lecturas + estado real de la puerta.
  unsigned long ahora = millis();
  if (ahora - ultimaLectura >= INTERVALO_LECTURA) {
    ultimaLectura = ahora;
    publicarLectura();
    // DEBUG: lectura cruda del pin para confirmar si el reed togglea al mover
    // el iman. Si raw se queda fijo (siempre 1 o siempre 0) aunque abras/cierres,
    // el problema es el cableado/iman del MC-38, no el firmware.
    int rawPuerta = digitalRead(PIN_PUERTA);
    Serial.printf("[DBG] puerta raw=%d (%s)\n",
                  rawPuerta, rawPuerta == HIGH ? "abierta" : "cerrada");
    // Reenvia el estado real cada ciclo (no solo al cambiar): garantiza que el
    // backend siempre tenga el estado actual aunque se haya perdido un flanco.
    publicarPuerta(true);
  }

  // 5. Heartbeat.
  if (ahora - ultimoHeartbeat >= INTERVALO_HEARTBEAT) {
    ultimoHeartbeat = ahora;
    publicarHeartbeat();
  }
}
