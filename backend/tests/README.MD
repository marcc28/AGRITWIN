# AgriTwin - Backend & IoT Simulation Test Suite

This directory contains automated unit tests built with `pytest` to verify the backend modules and the IoT simulation scripts in isolation, using mocks to avoid requiring live connections to external MQTT brokers or the cloud database.

## IoT Simulation & MQTT Subscriber Tests (`unit/test_mqtt_subscriber.py`)
Inside the `unit/` folder, the `test_mqtt_subscriber.py` file validates the end-to-end IoT telemetry pipeline across the simulation and reception scripts:

* **ESP32 Hardware Simulator (`iot/mqtt_sensor_simulator.py`):** Tests the MQTT broker connection callbacks, the realistic generation of environmental sensor readings (air temperature, air humidity, soil moisture, and light intensity), and the JSON payload publishing cycle.
* **MQTT Subscriber Service (`backend/services/mqtt_subscriber.py`):** Verifies the `on_connect` and `on_message` callbacks, wildcard topic subscription (`agritwin/sensors/#`), valid JSON decoding, and error handling for malformed payloads. It also checks that every message is registered in the device status monitor (passed to the MQTT client as `userdata`) and that the monitor is started together with the listener.
* **Database Telemetry Persistence (`backend/db/database.py` - `save_telemetry`):** Checks that intercepted sensor payloads are properly mapped and inserted into the Supabase `telemetry` table, and verifies safe fallback behavior when the database client is unavailable.

## Device Status Monitor Tests (`unit/test_device_status_monitor.py`)
The `test_device_status_monitor.py` file validates the automatic `devices.battery_status` logic. The tests use a fake clock (`FakeClock`), so time moves forward instantly without waiting real seconds, and mocks instead of Supabase:

* **Device Status Monitor (`backend/services/device_status_monitor.py`):** Verifies that a board sending data is set to `TRUE`, a board without data for more than 15 seconds is set to `FALSE`, a short delay does not change the status, the 15-second grace period after startup, that the database is written only when the status changes, and that the background thread survives errors and stops cleanly.
* **Device Database Functions (`backend/db/database.py` - `get_devices_status`, `set_device_battery_status`):** Checks reading and updating the `devices` table, including the safe fallback when the database client is unavailable or the query fails.

## Weather Forecast Tests (`unit/test_weather_service.py`, `unit/test_field_weather_service.py`, `unit/router/test_weather_router.py`, `unit/router/test_weather_flow.py`)
These files validate the weather forecast of a field (#55). Open-Meteo is replaced by an `httpx.MockTransport`, so no real call is made, and the database is an in-memory SQLite:

* **Open-Meteo client (`backend/services/weather_service.py`, `backend/services/open_meteo.py`):** Verifies the parsing of the current weather, next hours and daily forecast, units and languages, the town search for fields without coordinates, the retry after a timeout or a 5xx answer, and the mapping of provider errors to 404 / 502 / 503.
* **Field weather (`backend/services/field_weather_service.py`):** Checks that the coordinates of the field are used, the language of the user's profile, the `weather_cache` table (reuse, expiry and new forecast when the field moves), fields without location, and that a field of another user is not found.
* **Weather routes (`backend/api/v1/weather.py`):** Checks the query parameters, the error codes and that the field weather is requested for the logged user.
* **Full flow (`unit/router/test_weather_flow.py`):** Calls `GET /api/v1/weather/fields/{field_id}` with a real login token, going through the route, the service, the database and the mocked Open-Meteo: valid location, town without coordinates, missing location, field of another user, external API unavailable and request without login.

## How to run the tests
From the `backend` directory, run the IoT test suites using `uv`:
```bash
uv run pytest tests/unit/test_mqtt_subscriber.py tests/unit/test_device_status_monitor.py
```

To run the weather forecast tests:
```bash
uv run pytest tests/unit/test_weather_service.py tests/unit/test_field_weather_service.py tests/unit/router/test_weather_router.py tests/unit/router/test_weather_flow.py
```
