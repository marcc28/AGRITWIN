import paho.mqtt.client as mqtt
import time
import json
import random
from datetime import datetime, timezone


# MQTT CONFIGURATION

MQTT_BROKER = "broker.hivemq.com" 
MQTT_PORT = 1883
SLEEP_TIME_SECONDS = 5 
# Note: MQTT_TOPIC is no longer global, it's now specific to each device


# MULTI-DEVICE & MULTI-FIELD CONFIGURATION 

# Dictionary holding the target topic and initial state for each ESP32 board
DEVICES = {
    # Devices located in Field 1
    "esp32_sim_01": {
        "topic": "agritwin/sensors/field_1",
        "state": {"temp": 18.5, "hum": 65.0, "soil": 45.0, "light": 30000.0}
    },
    "esp32_sim_02": {
        "topic": "agritwin/sensors/field_1",
        "state": {"temp": 19.2, "hum": 62.0, "soil": 42.0, "light": 31500.0}
    },
    
    # Devices located in Field 2 (e.g., the balcony)
    "esp32_sim_03": {
        "topic": "agritwin/sensors/field_2",
        "state": {"temp": 25.8, "hum": 50.0, "soil": 30.0, "light": 85000.0}
    }
}


# MQTT CALLBACKS

def on_connect(client, userdata, flags, rc):
    """Callback triggered when the client connects to the broker."""
    if rc == 0:
        print(f"[SUCCESS] Connected to MQTT broker: {MQTT_BROKER}")
    else:
        print(f"[ERROR] Connection failed. Code: {rc}")

def on_publish(client, userdata, mid):
    pass 


# SENSOR DATA GENERATOR (Random Walk per device)

def update_sensor_data(state):
    """Updates the sensor state using a random walk."""
    state["temp"] = max(10.0, min(40.0, state["temp"] + random.uniform(-0.2, 0.2)))
    state["hum"] = max(30.0, min(95.0, state["hum"] + random.uniform(-0.5, 0.5)))
    state["soil"] = max(20.0, min(80.0, state["soil"] + random.uniform(-0.1, 0.1)))
    state["light"] = max(0.0, min(100000.0, state["light"] + random.uniform(-500, 500)))
    
    return round(state["temp"], 2), round(state["hum"], 2), round(state["soil"], 2), round(state["light"], 2)


# MAIN FUNCTION: MULTI-FIELD SIMULATION

def run_simulation():
    print("[INFO] Starting multi-field dynamic data simulation...")

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, "AgriTwin_ESP32_MultiSim")
    client.on_connect = on_connect
    client.on_publish = on_publish

    print("[INFO] Attempting to connect to the broker...")
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start() 

    print("\n[START] MULTI-FIELD TRANSMISSION STARTED (Press Ctrl+C to stop)\n")
    
    try:
        while True:
            current_timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            
            # Loop through each configured device
            for device_id, device_info in DEVICES.items():
                target_topic = device_info["topic"]
                state = device_info["state"]
                
                temp, hum, soil, light = update_sensor_data(state)

                payload = {
                    "device_id": device_id,
                    "timestamp": current_timestamp,
                    "sensors": {
                        "air_temperature_c": temp,
                        "air_humidity_percent": hum,
                        "soil_moisture_percent": soil,
                        "light_intensity_lux": light
                    }
                }
                
                json_payload = json.dumps(payload)
                
                # Publish to the specific topic assigned to this device
                print(f"[PUBLISH to {target_topic}] {device_id} -> {json_payload}")
                client.publish(target_topic, json_payload)
            
            print("-" * 70)
            time.sleep(SLEEP_TIME_SECONDS)

    except KeyboardInterrupt:
        print("\n[STOP] Simulation manually interrupted by user.")
    finally:
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    run_simulation()