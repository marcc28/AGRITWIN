// Normal mode: keeps Wi-Fi and MQTT connected and publishes the sensor
// readings every TELEMETRY_INTERVAL_MS on agritwin/sensors/field_<id>.
//
// Payload (same format as iot/mqtt_sensor_simulator.py):
// {
//   "device_id": "esp32_A1B2C3D4E5F6",
//   "timestamp": "2026-11-03T17:20:00Z",
//   "sensors": {
//     "air_temperature_c": 18.5,
//     "air_humidity_percent": 65.0,
//     "soil_moisture_percent": 45.0,
//     "light_intensity_lux": 30000.0
//   }
// }
// A sensor that cannot be read is sent as null.
#pragma once

#include "settings.h"

void telemetryBegin(const DeviceSettings& settings);
void telemetryLoop();
