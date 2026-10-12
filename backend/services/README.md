# AgriTwin - MQTT Subscriber Service (Backend)

This directory contains the Python background service responsible for intercepting real-time IoT sensor telemetry sent from ESP32 boards (or the simulator) via the MQTT protocol through the mqtt_subscriber.py file.

## How it works

1. **Broker Connection:** The `mqtt_subscriber.py` script connects to the public MQTT broker (`broker.hivemq.com`) on port `1883`.
2. **Topic Subscription:** It subscribes to the wildcard topic `agritwin/sensors/#`, allowing it to capture telemetry data concurrently from all simulated fields and devices.
3. **Processing & Persistence:** When a JSON message is intercepted, the `on_message` callback decodes the payload and passes it directly to the `save_telemetry` database function, which inserts the live sensor data into the `telemetria` table on the Supabase cloud database (PostgreSQL).
4. **Background Execution:** Using the blocking `loop_forever()` function, this script runs as a continuous background listener process, completely independent of the main FastAPI web server.

## Dependencies

This service requires the `paho-mqtt` and `supabase` libraries. Since the backend uses `uv` for package management, you can install the dependencies by running the following commands in the backend root directory:

```bash
uv add paho-mqtt
uv add supabase
```

## How to run it

To test the complete data pipeline locally, open your terminal in the main `backend` directory and run the service as a Python module:

```bash
uv run python -m services.mqtt_subscriber
```