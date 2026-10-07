# AgriTwin - Backend MQTT Subscriber Service

This directory contains the background service responsible for listening to the IoT sensor telemetry coming from the ESP32 boards via the MQTT protocol.

## How it works
The `mqtt_subscriber.py` script connects to the public broker (`broker.hivemq.com`) and subscribes to the `#` wildcard topic (e.g., `agritwin/sensors/#`) to intercept data from all fields concurrently.
Because it uses a blocking `loop_forever()` function, this script **must run as a separate background process**, completely independent of the FastAPI web server, to prevent blocking the HTTP endpoints.

## Dependencies
This service requires the `paho-mqtt` (v1) library.
Since the backend uses `uv` for package management, install it by running:
```bash
uv add paho-mqtt
Database Integration (Next Steps)
The interception logic is already complete. To persist the data into the Supabase PostgreSQL database:

Create an insertion function in the db/ module.

Import that function into mqtt_subscriber.py.

Locate the TODO comment inside the on_message callback.

Replace the print(json.dumps(payload)) statement with the database function, passing the parsed payload dictionary.