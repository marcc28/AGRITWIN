// AgriTwin ESP32 field node - build-time configuration.
// Everything that depends on the wiring or on the backend lives here.
#pragma once

#include <Arduino.h>

// ---------------------------------------------------------------------------
// Firmware identity
// ---------------------------------------------------------------------------
#define FIRMWARE_VERSION "0.1.1"
#define DEVICE_MODEL "AgriTwin Soil Node"
// Prefix of the device id. The id is "esp32_" + the 12 hex digits of the MAC,
// e.g. esp32_A1B2C3D4E5F6. It is the primary key of the 'devices' table.
#define DEVICE_ID_PREFIX "esp32_"

// ---------------------------------------------------------------------------
// Wiring (see iot/firmware/README.md)
//
// If both I2C sensors use the same SDA/SCL pins they share one bus
// (AHT 0x38, BH1750 0x23, no collision). With different pins the firmware
// automatically uses the second I2C controller (Wire1) for the BH1750.
//
// Pin rules:
//   - GPIO 0, 2, 5, 12, 15: strapping pins, avoid them for sensors
//     (GPIO12 held HIGH by a pull-up at power-on = the board may not boot)
//   - GPIO 25, 26, 27, 14, 12, 13, 4, 2, 15 are ADC2: analogRead() fails while
//     Wi-Fi is on. They are fine for digital use such as I2C, but the analog
//     soil sensor must be on ADC1 (GPIO 32-39).
// ---------------------------------------------------------------------------
// Current prototype wiring: two separate I2C buses.
// AHT SCL moved from GPIO12 (strapping pin) to GPIO13.
constexpr int AHT_SDA_PIN = 14;
constexpr int AHT_SCL_PIN = 13;
// If the BH1750 is "not found" on the Serial Monitor, swap these two values:
// SDA and SCL inverted do no damage, the sensor simply does not answer.
constexpr int BH1750_SDA_PIN = 26;
constexpr int BH1750_SCL_PIN = 25;

// Capacitive soil moisture sensor AOUT. Must be an ADC1 pin (32-39).
// Moved from GPIO27 (ADC2, unusable with Wi-Fi on) to GPIO34.
constexpr int SOIL_SENSOR_PIN = 34;

// On-board BOOT button: hold it for FACTORY_RESET_HOLD_MS to erase the Wi-Fi
// settings and go back to Bluetooth setup mode.
constexpr int RESET_BUTTON_PIN = 0;
constexpr uint32_t FACTORY_RESET_HOLD_MS = 5000;

// On-board blue LED of most ESP32 DevKit boards. Set to -1 if there is none.
constexpr int STATUS_LED_PIN = 2;

// ---------------------------------------------------------------------------
// Soil sensor calibration (raw 12-bit ADC values, 0-4095).
// Read the "soil raw" value printed on the Serial Monitor:
//   - sensor in open air      -> SOIL_RAW_DRY
//   - sensor in a glass of water (up to the line) -> SOIL_RAW_WET
// ---------------------------------------------------------------------------
constexpr int SOIL_RAW_DRY = 3000;
constexpr int SOIL_RAW_WET = 1300;
// Below this value the sensor is considered disconnected.
constexpr int SOIL_RAW_MIN_VALID = 100;

// ---------------------------------------------------------------------------
// Backend (must match backend/services/mqtt_subscriber.py)
// ---------------------------------------------------------------------------
#define MQTT_BROKER_HOST "broker.hivemq.com"
constexpr uint16_t MQTT_BROKER_PORT = 1883;
// Final topic: agritwin/sensors/field_<field_id>
#define MQTT_TOPIC_PREFIX "agritwin/sensors/field_"

// The backend marks a board offline after 15 s without data, so keep 5 s.
constexpr uint32_t TELEMETRY_INTERVAL_MS = 5000;
constexpr uint32_t MQTT_RETRY_INTERVAL_MS = 5000;
// In normal mode, a new Wi-Fi attempt while the network is missing.
constexpr uint32_t WIFI_RETRY_INTERVAL_MS = 10000;

#define NTP_SERVER_1 "pool.ntp.org"
#define NTP_SERVER_2 "time.google.com"

// ---------------------------------------------------------------------------
// Bluetooth Low Energy provisioning service (first setup from the app)
// ---------------------------------------------------------------------------
#define BLE_NAME_PREFIX "AgriTwin-"
#define BLE_SERVICE_UUID       "422285f2-0000-4631-a335-64b1ab75567c"
#define BLE_CHAR_INFO_UUID     "422285f2-0001-4631-a335-64b1ab75567c"  // read
#define BLE_CHAR_SSID_UUID     "422285f2-0002-4631-a335-64b1ab75567c"  // write
#define BLE_CHAR_PASSWORD_UUID "422285f2-0003-4631-a335-64b1ab75567c"  // write
#define BLE_CHAR_FIELD_UUID    "422285f2-0004-4631-a335-64b1ab75567c"  // write
#define BLE_CHAR_COMMAND_UUID  "422285f2-0005-4631-a335-64b1ab75567c"  // write
#define BLE_CHAR_STATUS_UUID   "422285f2-0006-4631-a335-64b1ab75567c"  // read + notify

// How long the board tries the Wi-Fi during setup, with a new attempt every
// WIFI_ATTEMPT_MS (phone hotspots often need more than one attempt).
// Keep WIFI_TEST_TIMEOUT_MS + 5 s (Internet test) below the 40 s the app and
// tools/provision_ble.py wait for the answer.
constexpr uint32_t WIFI_TEST_TIMEOUT_MS = 30000;
constexpr uint32_t WIFI_ATTEMPT_MS = 10000;
