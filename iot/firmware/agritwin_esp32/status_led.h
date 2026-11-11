// Non-blocking on-board LED patterns, so the farmer can see the board state
// without the app:
//   slow blink (1 s)  -> Bluetooth setup mode, waiting for the app
//   fast blink (0.2 s)-> connecting to Wi-Fi / MQTT
//   steady on         -> online, sending data
#pragma once

#include <Arduino.h>

#include "config.h"

enum class LedMode { Setup, Connecting, Online };

inline LedMode& ledMode() {
  static LedMode mode = LedMode::Setup;
  return mode;
}

inline void setLedMode(LedMode mode) { ledMode() = mode; }

inline void ledBegin() {
  if (STATUS_LED_PIN >= 0) {
    pinMode(STATUS_LED_PIN, OUTPUT);
    digitalWrite(STATUS_LED_PIN, LOW);
  }
}

inline void ledLoop() {
  if (STATUS_LED_PIN < 0) {
    return;
  }
  if (ledMode() == LedMode::Online) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    return;
  }
  const uint32_t halfPeriod = ledMode() == LedMode::Setup ? 1000 : 200;
  digitalWrite(STATUS_LED_PIN, (millis() / halfPeriod) % 2 ? HIGH : LOW);
}
