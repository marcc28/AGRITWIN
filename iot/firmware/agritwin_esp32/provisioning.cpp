#include "provisioning.h"

#include <NimBLEDevice.h>
#include <WiFi.h>

#include <mutex>
#include <string>

#include "config.h"
#include "settings.h"
#include "status_led.h"
#include "wifi_diag.h"

namespace {

// Values written by the app. BLE callbacks run in the NimBLE task while
// provisioningLoop() runs in the Arduino loop task, hence the mutex.
std::mutex dataMutex;
std::string pendingSsid;
std::string pendingPassword;
std::string pendingFieldId;
volatile bool connectRequested = false;

NimBLECharacteristic* statusChar = nullptr;


void setStatus(const char* status) {
  Serial.printf("[SETUP] status -> %s\n", status);
  if (statusChar != nullptr) {
    statusChar->setValue(std::string(status));
    statusChar->notify();
  }
}

std::string valueOf(NimBLECharacteristic* characteristic) {
  NimBLEAttValue value = characteristic->getValue();
  return std::string(value.c_str(), value.length());
}

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* server, NimBLEConnInfo& connInfo) override {
    Serial.printf("[SETUP] app connected: %s\n",
                  connInfo.getAddress().toString().c_str());
  }

  void onDisconnect(NimBLEServer* server, NimBLEConnInfo& connInfo,
                    int reason) override {
    Serial.printf("[SETUP] app disconnected (reason %d)\n", reason);
  }
};

class WriteCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* characteristic,
               NimBLEConnInfo& connInfo) override {
    const NimBLEUUID uuid = characteristic->getUUID();
    const std::string value = valueOf(characteristic);
    std::lock_guard<std::mutex> lock(dataMutex);

    if (uuid == NimBLEUUID(BLE_CHAR_SSID_UUID)) {
      pendingSsid = value;
      Serial.printf("[SETUP] SSID received: %s\n", value.c_str());
    } else if (uuid == NimBLEUUID(BLE_CHAR_PASSWORD_UUID)) {
      pendingPassword = value;
      // Never print the password itself.
      Serial.printf("[SETUP] password received (%u chars)\n",
                    static_cast<unsigned>(value.length()));
    } else if (uuid == NimBLEUUID(BLE_CHAR_FIELD_UUID)) {
      pendingFieldId = value;
      Serial.printf("[SETUP] field id received: %s\n", value.c_str());
    } else if (uuid == NimBLEUUID(BLE_CHAR_COMMAND_UUID)) {
      if (value == "connect") {
        connectRequested = true;
      } else {
        Serial.printf("[SETUP] unknown command: %s\n", value.c_str());
      }
    }
  }
};

ServerCallbacks serverCallbacks;
WriteCallbacks writeCallbacks;

std::string buildInfoJson() {
  char buffer[200];
  snprintf(buffer, sizeof(buffer),
           "{\"device_id\":\"%s\",\"serial\":\"%s\",\"fw\":\"%s\","
           "\"model\":\"%s\"}",
           deviceId().c_str(), deviceSerial().c_str(), FIRMWARE_VERSION,
           DEVICE_MODEL);
  return std::string(buffer);
}

// Tries the Wi-Fi received from the app for up to WIFI_TEST_TIMEOUT_MS,
// starting a new attempt every WIFI_ATTEMPT_MS (phone hotspots often need
// more than one). Returns nullptr on success or the error status to send.
const char* testWifi(const String& ssid, const String& password) {
  wifiResetLastReason();
  WiFi.mode(WIFI_STA);

  const uint32_t start = millis();
  uint32_t attemptStart = 0;
  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED &&
         millis() - start < WIFI_TEST_TIMEOUT_MS) {
    // A new attempt only if the previous one is not still waiting for an IP.
    if ((attempt == 0 || millis() - attemptStart >= WIFI_ATTEMPT_MS) &&
        !wifiAssociatedWithoutIp()) {
      attempt++;
      attemptStart = millis();
      Serial.printf("[SETUP] Wi-Fi attempt %d to \"%s\"\n", attempt,
                    ssid.c_str());
      WiFi.disconnect();
      WiFi.begin(ssid.c_str(), password.c_str());
    }
    // A wrong password will not get better with more attempts.
    if (wifiReasonIsWrongPassword(wifiLastRealReason())) {
      break;
    }
    ledLoop();
    delay(100);
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[SETUP] Wi-Fi OK, IP %s\n",
                  WiFi.localIP().toString().c_str());
    return nullptr;
  }

  const uint8_t reason = wifiLastRealReason();
  const bool waitingForIp = wifiAssociatedWithoutIp();
  WiFi.disconnect(true);
  Serial.printf("[SETUP] Wi-Fi failed after %d attempts, reason %u (%s)%s\n",
                attempt, reason, wifiReasonName(reason),
                waitingForIp ? ", associated but no IP from the router" : "");

  if (wifiReasonIsNotFound(reason)) {
    return "error:wifi_not_found";
  }
  if (wifiReasonIsWrongPassword(reason)) {
    return "error:wrong_password";
  }
  return "error:wifi_timeout";
}

// Wi-Fi connected is not enough: checks that the MQTT broker is reachable.
bool testInternet() {
  WiFiClient client;
  const bool reachable = client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, 5000);
  client.stop();
  return reachable;
}

void handleConnectCommand() {
  DeviceSettings settings;
  std::string fieldText;
  {
    std::lock_guard<std::mutex> lock(dataMutex);
    settings.wifiSsid = pendingSsid.c_str();
    settings.wifiPassword = pendingPassword.c_str();
    fieldText = pendingFieldId;
  }

  if (settings.wifiSsid.isEmpty() || fieldText.empty()) {
    setStatus("error:missing_data");
    return;
  }
  settings.fieldId = atol(fieldText.c_str());
  if (settings.fieldId <= 0) {
    setStatus("error:bad_field_id");
    return;
  }

  setStatus("connecting");
  setLedMode(LedMode::Connecting);

  const char* wifiError = testWifi(settings.wifiSsid, settings.wifiPassword);
  if (wifiError != nullptr) {
    setStatus(wifiError);
    setLedMode(LedMode::Setup);
    return;
  }
  if (!testInternet()) {
    WiFi.disconnect(true);
    setStatus("error:no_internet");
    setLedMode(LedMode::Setup);
    return;
  }

  saveSettings(settings);
  setStatus("connected");
  // Give the app time to receive the notification before the reboot.
  delay(1500);
  Serial.println("[SETUP] settings saved, rebooting in normal mode");
  ESP.restart();
}

}  // namespace

void provisioningBegin() {
  setLedMode(LedMode::Setup);
  wifiDiagBegin();

  // Short name visible in the app: AgriTwin-E5F6 (last 4 MAC digits).
  const String serial = deviceSerial();
  const String bleName = String(BLE_NAME_PREFIX) + serial.substring(serial.length() - 4);

  NimBLEDevice::init(bleName.c_str());
  NimBLEDevice::setMTU(256);  // SSID + password fit in one write

  NimBLEServer* server = NimBLEDevice::createServer();
  server->setCallbacks(&serverCallbacks);
  server->advertiseOnDisconnect(true);

  NimBLEService* service = server->createService(BLE_SERVICE_UUID);

  NimBLECharacteristic* info =
      service->createCharacteristic(BLE_CHAR_INFO_UUID, NIMBLE_PROPERTY::READ);
  info->setValue(buildInfoJson());

  service->createCharacteristic(BLE_CHAR_SSID_UUID, NIMBLE_PROPERTY::WRITE)
      ->setCallbacks(&writeCallbacks);
  service->createCharacteristic(BLE_CHAR_PASSWORD_UUID, NIMBLE_PROPERTY::WRITE)
      ->setCallbacks(&writeCallbacks);
  service->createCharacteristic(BLE_CHAR_FIELD_UUID, NIMBLE_PROPERTY::WRITE)
      ->setCallbacks(&writeCallbacks);
  service->createCharacteristic(BLE_CHAR_COMMAND_UUID, NIMBLE_PROPERTY::WRITE)
      ->setCallbacks(&writeCallbacks);

  statusChar = service->createCharacteristic(
      BLE_CHAR_STATUS_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  statusChar->setValue(std::string("waiting"));

  service->start();

  NimBLEAdvertising* advertising = NimBLEDevice::getAdvertising();
  // The 128-bit UUID fills most of the 31-byte advertising packet, so the
  // name goes in the scan response. enableScanResponse() must come first.
  advertising->enableScanResponse(true);
  advertising->setName(bleName.c_str());
  advertising->addServiceUUID(BLE_SERVICE_UUID);
  advertising->start();

  Serial.printf("[SETUP] Bluetooth setup mode, advertising as %s\n",
                bleName.c_str());
  Serial.printf("[SETUP] device id: %s\n", deviceId().c_str());
}

void provisioningLoop() {
  if (connectRequested) {
    connectRequested = false;
    handleConnectCommand();
  }
}
