import paho.mqtt.client as mqtt
import json


# MQTT CONFIGURATION

MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
# Using the '#' wildcard to subscribe to ALL fields (e.g., field_1, field_2)
MQTT_TOPIC = "agritwin/sensors/#" 


# MQTT CALLBACKS

def on_connect(client, userdata, flags, rc):
    """Callback triggered when connected to the broker."""
    if rc == 0:
        print(f"[BACKEND-SUCCESS] Connected to MQTT broker: {MQTT_BROKER}")
        # Subscribe to the topic upon successful connection
        client.subscribe(MQTT_TOPIC)
        print(f"[BACKEND-INFO] Subscribed and listening on topic: {MQTT_TOPIC}")
    else:
        print(f"[BACKEND-ERROR] Connection failed. Code: {rc}")

def on_message(client, userdata, msg):
    """Callback triggered when a new message is received from the broker."""
    try:
        # Decode the JSON payload received from the ESP32 (or simulator)
        payload = json.loads(msg.payload.decode('utf-8'))
        
        print(f"\n[BACKEND-RECEIVE] New data intercepted on topic: {msg.topic}")
        # Pretty-print the JSON data
        print(json.dumps(payload, indent=4))
        
        # TODO for Flavio: Pass this 'payload' dictionary to the database functions
        # e.g., db.save_telemetry_data(payload)
        
    except json.JSONDecodeError:
        print("[BACKEND-ERROR] Received message is not a valid JSON.")


# MAIN LISTENER FUNCTION

def start_mqtt_listener():
    print("[BACKEND-INFO] Initializing MQTT Subscriber Service...")
    
    # Initialize client with API Version 1
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, "AgriTwin_FastAPI_Backend")
    client.on_connect = on_connect
    client.on_message = on_message

    print("[BACKEND-INFO] Attempting connection...")
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    
    # loop_forever() blocks the execution and keeps listening indefinitely
    client.loop_forever()

if __name__ == "__main__":
    start_mqtt_listener()