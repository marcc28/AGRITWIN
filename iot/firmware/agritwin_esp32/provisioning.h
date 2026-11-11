// Bluetooth Low Energy setup mode ("provisioning").
//
// Runs only when the board has no saved Wi-Fi. The AgriTwin app connects to
// the board over BLE, writes Wi-Fi SSID, password and field id, then sends
// the "connect" command. The board tests the Wi-Fi and the Internet, reports
// the result on the STATUS characteristic and, on success, saves everything
// and reboots in normal (telemetry) mode.
//
// Protocol (all values are UTF-8 strings):
//   INFO      read    {"device_id":"esp32_...","serial":"...","fw":"0.1.0",...}
//   SSID      write   Wi-Fi network name (2.4 GHz only)
//   PASSWORD  write   Wi-Fi password (write-only, never readable)
//   FIELD_ID  write   id of the field in the AgriTwin backend, e.g. "3"
//   COMMAND   write   "connect"
//   STATUS    read/notify
//                     waiting | connecting | connected
//                     error:missing_data | error:bad_field_id
//                     error:wifi_not_found | error:wrong_password
//                     error:wifi_timeout | error:no_internet
#pragma once

void provisioningBegin();
void provisioningLoop();
