// Wi-Fi diagnostics shared by setup mode and normal mode.
//
// Prints every Wi-Fi event on the Serial Monitor (associated, got IP,
// disconnected + reason) and remembers the last "real" disconnect reason,
// ignoring the ones caused by the board itself (e.g. 8 / 36 "station
// leaving"), so the real cause of a failed connection is not lost.
#pragma once

#include <Arduino.h>

void wifiDiagBegin();

// Last disconnect reason not caused by the board itself, 0 if none.
uint8_t wifiLastRealReason();
void wifiResetLastReason();

// True when the board is associated with the access point but has no IP yet.
bool wifiAssociatedWithoutIp();

// Human-readable name of a disconnect reason, e.g. "NO_AP_FOUND".
const char* wifiReasonName(uint8_t reason);

// True for the reasons meaning "network not found / not usable".
bool wifiReasonIsNotFound(uint8_t reason);
// True for the reasons meaning "wrong password".
bool wifiReasonIsWrongPassword(uint8_t reason);
