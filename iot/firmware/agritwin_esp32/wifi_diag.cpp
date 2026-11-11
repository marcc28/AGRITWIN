#include "wifi_diag.h"

#include <WiFi.h>

namespace {

volatile uint8_t lastRealReason = 0;
volatile bool associated = false;
volatile bool hasIp = false;
bool started = false;

// Reasons generated when the board itself disconnects (WiFi.disconnect(),
// a new WiFi.begin()...): they say nothing about the network.
bool isSelfInflicted(uint8_t reason) {
  return reason == WIFI_REASON_ASSOC_LEAVE || reason == WIFI_REASON_STA_LEAVING;
}

void onWifiEvent(arduino_event_id_t event, arduino_event_info_t info) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_CONNECTED:
      associated = true;
      Serial.println("[WIFI] associated with the access point, waiting for IP...");
      break;
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      hasIp = true;
      Serial.printf("[WIFI] got IP %s\n", WiFi.localIP().toString().c_str());
      break;
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED: {
      const uint8_t reason = info.wifi_sta_disconnected.reason;
      associated = false;
      hasIp = false;
      if (!isSelfInflicted(reason)) {
        lastRealReason = reason;
      }
      Serial.printf("[WIFI] disconnected, reason %u (%s)\n", reason,
                    wifiReasonName(reason));
      break;
    }
    default:
      break;
  }
}

}  // namespace

void wifiDiagBegin() {
  if (started) {
    return;
  }
  started = true;
  WiFi.onEvent(onWifiEvent);
}

uint8_t wifiLastRealReason() { return lastRealReason; }

void wifiResetLastReason() { lastRealReason = 0; }

bool wifiAssociatedWithoutIp() { return associated && !hasIp; }

bool wifiReasonIsNotFound(uint8_t reason) {
  return reason == WIFI_REASON_NO_AP_FOUND ||
         reason == WIFI_REASON_NO_AP_FOUND_W_COMPATIBLE_SECURITY ||
         reason == WIFI_REASON_NO_AP_FOUND_IN_AUTHMODE_THRESHOLD ||
         reason == WIFI_REASON_NO_AP_FOUND_IN_RSSI_THRESHOLD;
}

bool wifiReasonIsWrongPassword(uint8_t reason) {
  return reason == WIFI_REASON_AUTH_FAIL ||
         reason == WIFI_REASON_4WAY_HANDSHAKE_TIMEOUT ||
         reason == WIFI_REASON_HANDSHAKE_TIMEOUT ||
         reason == WIFI_REASON_AUTH_EXPIRE;
}

const char* wifiReasonName(uint8_t reason) {
  switch (reason) {
    case WIFI_REASON_AUTH_EXPIRE:
      return "AUTH_EXPIRE";
    case WIFI_REASON_ASSOC_LEAVE:
      return "ASSOC_LEAVE (board disconnected itself)";
    case WIFI_REASON_4WAY_HANDSHAKE_TIMEOUT:
      return "4WAY_HANDSHAKE_TIMEOUT (wrong password?)";
    case WIFI_REASON_STA_LEAVING:
      return "STA_LEAVING (board disconnected itself)";
    case WIFI_REASON_BEACON_TIMEOUT:
      return "BEACON_TIMEOUT (signal lost)";
    case WIFI_REASON_NO_AP_FOUND:
      return "NO_AP_FOUND (network not visible, 5 GHz?)";
    case WIFI_REASON_AUTH_FAIL:
      return "AUTH_FAIL (wrong password?)";
    case WIFI_REASON_ASSOC_FAIL:
      return "ASSOC_FAIL";
    case WIFI_REASON_HANDSHAKE_TIMEOUT:
      return "HANDSHAKE_TIMEOUT (wrong password?)";
    case WIFI_REASON_CONNECTION_FAIL:
      return "CONNECTION_FAIL";
    case WIFI_REASON_NO_AP_FOUND_W_COMPATIBLE_SECURITY:
      return "NO_AP_FOUND_W_COMPATIBLE_SECURITY (WPA3 only?)";
    case WIFI_REASON_NO_AP_FOUND_IN_AUTHMODE_THRESHOLD:
      return "NO_AP_FOUND_IN_AUTHMODE_THRESHOLD";
    case WIFI_REASON_NO_AP_FOUND_IN_RSSI_THRESHOLD:
      return "NO_AP_FOUND_IN_RSSI_THRESHOLD (signal too weak)";
    default:
      return "other";
  }
}
