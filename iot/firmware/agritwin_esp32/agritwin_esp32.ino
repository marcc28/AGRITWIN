// AgriTwin ESP32 field node firmware.
//
// Two modes, chosen at boot:
//   1. SETUP mode (no Wi-Fi saved): Bluetooth LE is on and waits for the
//      AgriTwin app to send Wi-Fi SSID, password and field id.
//   2. NORMAL mode (Wi-Fi saved): reads the sensors and publishes them via
//      MQTT every 5 seconds to the AgriTwin backend.
//
// Hold the BOOT button for 5 seconds at any time to erase the settings and
// go back to SETUP mode (e.g. new router or new field).
//
// Libraries (Arduino Library Manager): NimBLE-Arduino 2.x, PubSubClient,
// Adafruit AHTX0, BH1750 (by Christopher Laws). Board: ESP32 Dev Module.

#include <WiFi.h>

#include "config.h"
#include "provisioning.h"
#include "sensors.h"
#include "settings.h"
#include "status_led.h"
#include "telemetry.h"

namespace {

bool setupMode = false;
uint32_t buttonPressedSince = 0;
uint32_t lastSetupReading = 0;

void checkFactoryReset() {
  if (digitalRead(RESET_BUTTON_PIN) != LOW) {
    buttonPressedSince = 0;
    return;
  }
  if (buttonPressedSince == 0) {
    buttonPressedSince = millis();
    return;
  }
  if (millis() - buttonPressedSince >= FACTORY_RESET_HOLD_MS) {
    Serial.println("[RESET] BOOT held: erasing settings and rebooting");
    clearSettings();
    delay(200);
    ESP.restart();
  }
}

// In setup mode the readings are only printed: handy to test the wiring on
// the bench before the board has Wi-Fi.
void printReadingsWhileInSetup() {
  if (millis() - lastSetupReading >= TELEMETRY_INTERVAL_MS) {
    lastSetupReading = millis();
    printReading(sensorsRead());
  }
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.printf("\n=== AgriTwin node %s | fw %s ===\n", deviceId().c_str(),
                FIRMWARE_VERSION);

  ledBegin();
  pinMode(RESET_BUTTON_PIN, INPUT_PULLUP);
  // Credentials are stored by settings.cpp, not by the Wi-Fi driver.
  WiFi.persistent(false);

  sensorsBegin();

  DeviceSettings settings;
  if (loadSettings(settings)) {
    setupMode = false;
    Serial.printf("[BOOT] normal mode, field %ld\n", settings.fieldId);
    telemetryBegin(settings);
  } else {
    setupMode = true;
    Serial.println("[BOOT] no Wi-Fi saved -> Bluetooth setup mode");
    provisioningBegin();
  }
}

void loop() {
  checkFactoryReset();
  ledLoop();

  if (setupMode) {
    provisioningLoop();
    printReadingsWhileInSetup();
  } else {
    telemetryLoop();
  }
  delay(10);
}
