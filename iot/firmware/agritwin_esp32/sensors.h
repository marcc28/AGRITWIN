// Reads the three sensors of the field node:
//   - AHT20/AHT10  -> air temperature and air humidity (I2C, 0x38)
//   - BH1750       -> light intensity (I2C, 0x23)
//   - capacitive soil moisture sensor v1.x -> soil moisture (analog)
#pragma once

#include <Arduino.h>

struct SensorReading {
  bool hasAir = false;  // AHT answered
  float airTemperatureC = NAN;
  float airHumidityPercent = NAN;

  bool hasLight = false;  // BH1750 answered
  float lightLux = NAN;

  bool hasSoil = false;  // soil sensor connected
  int soilRaw = 0;       // raw ADC value, useful for calibration
  float soilMoisturePercent = NAN;
};

void sensorsBegin();
SensorReading sensorsRead();
void printReading(const SensorReading& reading);
