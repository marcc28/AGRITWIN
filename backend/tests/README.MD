# AgriTwin - Backend & IoT Simulation Test Suite

This directory contains automated unit tests built with `pytest` to verify the backend modules and the IoT simulation scripts in isolation, using mocks to avoid requiring live connections to external MQTT brokers or the cloud database.

## IoT Simulation & MQTT Subscriber Tests (`unit/test_mqtt_subscriber.py`)
Inside the `unit/` folder, the `test_mqtt_subscriber.py` file validates the end-to-end IoT telemetry pipeline across the simulation and reception scripts:

* **ESP32 Hardware Simulator (`iot/mqtt_sensor_simulator.py`):** Tests the MQTT broker connection callbacks, the realistic generation of environmental sensor readings (air temperature, air humidity, soil moisture, and light intensity), and the JSON payload publishing cycle.
* **MQTT Subscriber Service (`backend/services/mqtt_subscriber.py`):** Verifies the `on_connect` and `on_message` callbacks, wildcard topic subscription (`agritwin/sensors/#`), valid JSON decoding, and error handling for malformed payloads.
* **Database Telemetry Persistence (`backend/db/database.py` - `save_telemetry`):** Checks that intercepted sensor payloads are properly mapped and inserted into the Supabase `telemetria` table, and verifies safe fallback behavior when the database client is unavailable.

## How to run the tests
From the `backend` directory, run the test suite using `uv`:
```bash
uv run pytest tests/unit/test_mqtt_subscriber.py