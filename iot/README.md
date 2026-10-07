Files from the IOT Arduino functions, code, diagrams...
# AgriTwin - IoT Sensor Simulator

This directory contains the IoT simulation module for the AgriTwin project. 

The Python script (`mqtt_sensor_simulator.py`) simulates the behavior of multiple physical ESP32 boards equipped with environmental sensors (AHT25, Soil Moisture, BH1750FVI). It generates realistic telemetry data and transmits it to the backend via the MQTT protocol.

## Features
- **Multi-Device Simulation**: Simulates multiple ESP32 boards concurrently (e.g., `esp32_sim_01`, `esp32_sim_02`).
- **Multi-Field Support**: Dynamically publishes data to different MQTT topics (e.g., `agritwin/sensors/field_1`, `agritwin/sensors/field_2`) based on the simulated device's location.
- **Realistic Data Generation**: Uses a "Random Walk" mathematical algorithm to simulate realistic environmental fluctuations (temperature, humidity, soil moisture, and light) over time, which is essential to provide consistent input for the AI and Dashboard.
- **Lightweight Protocol**: Uses `broker.hivemq.com` to completely decouple the hardware from the FastAPI backend.

## Prerequisites
- Python 3.x
- `paho-mqtt` library (v1 API)

## Installation (macOS / Linux)

1. Open your terminal and navigate to the `iot` folder.
2. Install the required MQTT library using `pip3`. (On newer macOS versions, you might need to bypass system-wide package restrictions):

```bash
pip3 install paho-mqtt --break-system-packages
How to Run the Simulator
To start the transmission of sensor data to the backend, run the following command from the iot directory:

Bash
python3 mqtt_sensor_simulator.py
You will see the terminal connecting to the broker and publishing JSON payloads every 5 seconds. To stop the simulation, simply press Ctrl+C.

Data Structure Example
The simulator sends JSON payloads structured as follows:

JSON
{
    "device_id": "esp32_sim_01",
    "timestamp": "2026-10-07T10:00:00Z",
    "sensors": {
        "air_temperature_c": 18.5,
        "air_humidity_percent": 65.0,
        "soil_moisture_percent": 45.0,
        "light_intensity_lux": 30000.0
    }
}
