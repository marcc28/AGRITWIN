#include "telemetry.h"

#include <PubSubClient.h>
#include <WiFi.h>
#include <time.h>

#include "config.h"
#include "sensors.h"
#include "status_led.h"

namespace {

// Any epoch after 2024-01-01 means NTP has synchronised the clock.
constexpr time_t kMinValidEpoch = 1704067200;

WiFiClient networkClient;
PubSubClient mqtt(networkClient);

DeviceSettings activeSettings;
String topic;
uint32_t lastMqttAttempt = 0;
uint32_t lastPublish = 0;
bool wasWifiConnected = false;

bool clockIsSynced() { return time(nullptr) >= kMinValidEpoch; }

String isoTimestampUtc() {
  const time_t now = time(nullptr);
  struct tm utc;
  gmtime_r(&now, &utc);
  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &utc);
  return String(buffer);
}

// Writes a JSON number with 2 decimals, or null when the value is missing.
String jsonNumber(bool valid, float value) {
  return valid ? String(value, 2) : String("null");
}

String buildPayload(const SensorReading& r) {
  String json;
  json.reserve(260);
  json += "{\"device_id\":\"" + deviceId() + "\",";
  json += "\"timestamp\":\"" + isoTimestampUtc() + "\",";
  json += "\"sensors\":{";
  json += "\"air_temperature_c\":" + jsonNumber(r.hasAir, r.airTemperatureC) + ",";
  json += "\"air_humidity_percent\":" + jsonNumber(r.hasAir, r.airHumidityPercent) + ",";
  json += "\"soil_moisture_percent\":" + jsonNumber(r.hasSoil, r.soilMoisturePercent) + ",";
  json += "\"light_intensity_lux\":" + jsonNumber(r.hasLight, r.lightLux);
  json += "}}";
  return json;
}

void ensureMqttConnected() {
  if (mqtt.connected() || millis() - lastMqttAttempt < MQTT_RETRY_INTERVAL_MS) {
    return;
  }
  lastMqttAttempt = millis();
  setLedMode(LedMode::Connecting);
  Serial.printf("[MQTT] connecting to %s:%u ...\n", MQTT_BROKER_HOST,
                MQTT_BROKER_PORT);

  // The device id is unique, so it is a safe MQTT client id.
  if (mqtt.connect(deviceId().c_str())) {
    Serial.printf("[MQTT] connected, publishing on %s\n", topic.c_str());
  } else {
    Serial.printf("[MQTT] failed, state %d, retry in %lus\n", mqtt.state(),
                  static_cast<unsigned long>(MQTT_RETRY_INTERVAL_MS / 1000));
  }
}

void publishReading() {
  const SensorReading reading = sensorsRead();
  printReading(reading);

  const String payload = buildPayload(reading);
  if (mqtt.publish(topic.c_str(), payload.c_str())) {
    Serial.printf("[MQTT] -> %s\n", payload.c_str());
  } else {
    Serial.println("[MQTT] publish failed");
  }
}

}  // namespace

void telemetryBegin(const DeviceSettings& settings) {
  activeSettings = settings;
  topic = String(MQTT_TOPIC_PREFIX) + String(settings.fieldId);

  Serial.printf("[WIFI] connecting to \"%s\"\n", settings.wifiSsid.c_str());
  setLedMode(LedMode::Connecting);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(settings.wifiSsid.c_str(), settings.wifiPassword.c_str());

  // UTC time for the "timestamp" field (the backend stores UTC).
  configTime(0, 0, NTP_SERVER_1, NTP_SERVER_2);

  mqtt.setServer(MQTT_BROKER_HOST, MQTT_BROKER_PORT);
  mqtt.setBufferSize(512);  // default 256 bytes is too close to the payload size
  mqtt.setKeepAlive(30);
}

void telemetryLoop() {
  const bool wifiConnected = WiFi.status() == WL_CONNECTED;
  if (wifiConnected != wasWifiConnected) {
    wasWifiConnected = wifiConnected;
    if (wifiConnected) {
      Serial.printf("[WIFI] connected, IP %s\n", WiFi.localIP().toString().c_str());
    } else {
      // The router may just be rebooting: the saved settings are kept and
      // the ESP32 keeps retrying on its own (setAutoReconnect).
      Serial.println("[WIFI] connection lost, retrying...");
      setLedMode(LedMode::Connecting);
    }
  }
  if (!wifiConnected) {
    return;
  }

  ensureMqttConnected();
  if (!mqtt.connected()) {
    return;
  }
  mqtt.loop();
  setLedMode(LedMode::Online);

  // The backend needs a real timestamp, so wait for the NTP sync.
  if (!clockIsSynced()) {
    return;
  }
  if (millis() - lastPublish >= TELEMETRY_INTERVAL_MS) {
    lastPublish = millis();
    publishReading();
  }
}
