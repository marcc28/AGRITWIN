// Persistent settings stored in the ESP32 flash (NVS), they survive reboots
// and power loss. Written once by the Bluetooth setup.
#pragma once

#include <Arduino.h>

struct DeviceSettings {
  String wifiSsid;
  String wifiPassword;
  long fieldId = 0;
};

// Returns true when the board has already been set up (Wi-Fi + field saved).
bool loadSettings(DeviceSettings& out);
void saveSettings(const DeviceSettings& settings);
// Erases the saved settings: next boot starts the Bluetooth setup again.
void clearSettings();

// Unique and stable id of this board, derived from its MAC address.
const String& deviceId();
// MAC address as 12 hex digits, used as serial number.
const String& deviceSerial();
