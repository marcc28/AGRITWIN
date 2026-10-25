# AgriTwin - MQTT Subscriber Service (Backend)

This directory contains the Python background service responsible for intercepting real-time IoT sensor telemetry sent from ESP32 boards (or the simulator) via the MQTT protocol through the `mqtt_subscriber.py` file. The same service also keeps the status of every board (`devices.battery_status`) up to date.

## Files

| File | Purpose |
|---|---|
| `mqtt_subscriber.py` | Connects to the MQTT broker, receives the telemetry and saves it in Supabase |
| `device_status_monitor.py` | Background thread that sets `devices.battery_status` to `TRUE`/`FALSE` |

## How it works

1. **Broker Connection:** The `mqtt_subscriber.py` script connects to the public MQTT broker (`broker.hivemq.com`) on port `1883`.
2. **Topic Subscription:** It subscribes to the wildcard topic `agritwin/sensors/#`, allowing it to capture telemetry data concurrently from all simulated fields and devices.
3. **Processing & Persistence:** When a JSON message is intercepted, the `on_message` callback decodes the payload and passes it directly to the `save_telemetry` database function, which inserts the live sensor data into the `telemetry` table on the Supabase cloud database (PostgreSQL).
4. **Device Status:** After saving the data, `on_message` tells the `DeviceStatusMonitor` which board sent it (`register_message(device_id)`). The monitor runs in a background thread and updates `devices.battery_status` (see below).
5. **Background Execution:** Using the blocking `loop_forever()` function, this script runs as a continuous background listener process, completely independent of the main FastAPI web server.

## Device status (`battery_status`)

A board with an empty battery or without Internet cannot report its own status, so the backend decides it from the telemetry it receives:

| Last message received from the board | `battery_status` | Meaning |
|---|---|---|
| 15 seconds ago or less | `TRUE` | Board on and connected |
| More than 15 seconds ago | `FALSE` | Battery empty **or** board not connected to the Internet |

- The boards send data every ~5 seconds, so the 15 s timeout tolerates 2 lost messages without false alarms.
- The monitor checks all the devices registered in the `devices` table every 5 seconds.
- The database is written **only when the status of a board changes**, not on every message.
- Right after the service starts there is a 15 s grace period before a board that has not sent data yet is marked `FALSE`.
- Only boards registered in the `devices` table are checked.

The values can be changed at the top of `device_status_monitor.py`:

```python
OFFLINE_TIMEOUT_SECONDS = 15  # seconds without data before a board is marked FALSE
CHECK_INTERVAL_SECONDS = 5  # how often the devices are checked
```

## Dependencies

This service uses the `paho-mqtt` and `supabase` libraries, which are already listed in `pyproject.toml`. Install all the backend dependencies with `uv` from the `backend` directory:

```bash
uv sync
```

The `.env` file must contain `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.

## How to run it

To test the complete data pipeline locally, open your terminal in the main `backend` directory and run the service as a Python module:

```bash
uv run python -m services.mqtt_subscriber
```

Expected output when it works:

```text
[DEVICE-STATUS] Monitor started (offline after 15s without data, check every 5s)
[BACKEND-SUCCESS] Connected to MQTT broker: broker.hivemq.com
[BACKEND-INFO] Subscribed and listening on topic: agritwin/sensors/#
[DATABASE-SUCCESS] Telemetry data from esp32_sim_01 saved to Supabase!
[DEVICE-STATUS] esp32_sim_01 -> ONLINE
...
[DEVICE-STATUS] esp32_sim_01 -> OFFLINE (battery empty or no Internet)
```

Then start the IoT simulator from the `iot` directory (`python3 mqtt_sensor_simulator.py`). Stop it with `Ctrl+C` and, after 15-20 seconds, the boards are set to `FALSE`.

