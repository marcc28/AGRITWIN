#include "settings.h"

#include <Preferences.h>
#include <esp_mac.h>

#include "config.h"

namespace {

constexpr const char* kNamespace = "agritwin";
constexpr const char* kKeySsid = "ssid";
constexpr const char* kKeyPassword = "pass";
constexpr const char* kKeyField = "field";

String buildSerial() {
  uint8_t mac[6] = {0};
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  char buffer[13];
  snprintf(buffer, sizeof(buffer), "%02X%02X%02X%02X%02X%02X", mac[0], mac[1],
           mac[2], mac[3], mac[4], mac[5]);
  return String(buffer);
}

}  // namespace

bool loadSettings(DeviceSettings& out) {
  Preferences prefs;
  // Read-write mode creates the namespace on the very first boot, so the
  // core does not log a "NOT_FOUND" error.
  prefs.begin(kNamespace, false);
  out.wifiSsid = prefs.getString(kKeySsid, "");
  out.wifiPassword = prefs.getString(kKeyPassword, "");
  out.fieldId = prefs.getLong(kKeyField, 0);
  prefs.end();
  return out.wifiSsid.length() > 0 && out.fieldId > 0;
}

void saveSettings(const DeviceSettings& settings) {
  Preferences prefs;
  prefs.begin(kNamespace, false);
  prefs.putString(kKeySsid, settings.wifiSsid);
  prefs.putString(kKeyPassword, settings.wifiPassword);
  prefs.putLong(kKeyField, settings.fieldId);
  prefs.end();
}

void clearSettings() {
  Preferences prefs;
  prefs.begin(kNamespace, false);
  prefs.clear();
  prefs.end();
}

const String& deviceSerial() {
  static const String serial = buildSerial();
  return serial;
}

const String& deviceId() {
  static const String id = String(DEVICE_ID_PREFIX) + deviceSerial();
  return id;
}
