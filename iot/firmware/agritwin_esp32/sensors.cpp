#include "sensors.h"

#include <Adafruit_AHTX0.h>
#include <BH1750.h>
#include <Wire.h>

#include "config.h"

namespace {

constexpr uint8_t kBh1750Address = 0x23;
constexpr int kSoilSamples = 16;

Adafruit_AHTX0 aht;
BH1750 lightMeter(kBh1750Address);

bool ahtReady = false;
bool bh1750Ready = false;

// BH1750 uses the second I2C controller only when it is wired on other pins.
TwoWire* bh1750Bus() {
  const bool sharedBus =
      BH1750_SDA_PIN == AHT_SDA_PIN && BH1750_SCL_PIN == AHT_SCL_PIN;
  return sharedBus ? &Wire : &Wire1;
}

bool beginAht() {
  ahtReady = aht.begin(&Wire);
  if (!ahtReady) {
    Serial.println("[SENSORS] AHT not found (check SDA/SCL and power)");
  }
  return ahtReady;
}

bool beginBh1750() {
  bh1750Ready = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE,
                                 kBh1750Address, bh1750Bus());
  if (!bh1750Ready) {
    Serial.println("[SENSORS] BH1750 not found (check SDA/SCL and power)");
  }
  return bh1750Ready;
}

int readSoilRaw() {
  // Average several samples: the ESP32 ADC is noisy.
  long sum = 0;
  for (int i = 0; i < kSoilSamples; i++) {
    sum += analogRead(SOIL_SENSOR_PIN);
    delay(2);
  }
  return static_cast<int>(sum / kSoilSamples);
}

float soilRawToPercent(int raw) {
  // Capacitive sensors give a HIGHER value when the soil is DRY.
  const float span = static_cast<float>(SOIL_RAW_DRY - SOIL_RAW_WET);
  float percent = (SOIL_RAW_DRY - raw) * 100.0f / span;
  return constrain(percent, 0.0f, 100.0f);
}

}  // namespace

void sensorsBegin() {
  Wire.begin(AHT_SDA_PIN, AHT_SCL_PIN);
  if (bh1750Bus() == &Wire1) {
    Wire1.begin(BH1750_SDA_PIN, BH1750_SCL_PIN);
  }

  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_SENSOR_PIN, ADC_11db);  // 0 - ~3.1 V range

  beginAht();
  beginBh1750();
}

SensorReading sensorsRead() {
  SensorReading reading;

  // A sensor that was missing at boot (loose wire) is retried every cycle.
  if (ahtReady || beginAht()) {
    sensors_event_t humidity;
    sensors_event_t temperature;
    if (aht.getEvent(&humidity, &temperature)) {
      reading.hasAir = true;
      reading.airTemperatureC = temperature.temperature;
      reading.airHumidityPercent = humidity.relative_humidity;
    } else {
      ahtReady = false;
    }
  }

  if (bh1750Ready || beginBh1750()) {
    const float lux = lightMeter.readLightLevel();
    if (lux >= 0) {  // the library returns a negative value on error
      reading.hasLight = true;
      reading.lightLux = lux;
    } else {
      bh1750Ready = false;
    }
  }

  reading.soilRaw = readSoilRaw();
  if (reading.soilRaw >= SOIL_RAW_MIN_VALID) {
    reading.hasSoil = true;
    reading.soilMoisturePercent = soilRawToPercent(reading.soilRaw);
  }

  return reading;
}

void printReading(const SensorReading& r) {
  Serial.printf(
      "[SENSORS] air %s | hum %s | soil %s (raw %d) | light %s\n",
      r.hasAir ? String(r.airTemperatureC, 1).c_str() : "--",
      r.hasAir ? String(r.airHumidityPercent, 1).c_str() : "--",
      r.hasSoil ? String(r.soilMoisturePercent, 1).c_str() : "--", r.soilRaw,
      r.hasLight ? String(r.lightLux, 0).c_str() : "--");
}
