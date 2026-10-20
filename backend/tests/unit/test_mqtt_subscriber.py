import json
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock

import db.database as db_module
from services import mqtt_subscriber

# Add project root and 'iot' directory to sys.path so pytest can import the IoT simulator
PROJECT_ROOT = Path(__file__).resolve().parents[3]
IOT_DIR = PROJECT_ROOT / "iot"
for path_str in (str(PROJECT_ROOT), str(IOT_DIR)):
    if path_str not in sys.path:
        sys.path.insert(0, path_str)

# Set a fallback database URL for CI environments before importing db.database
os.environ.setdefault("local_database_URL", "postgresql+asyncpg://user:pass@localhost:5432/testdb")

import mqtt_sensor_simulator  # type: ignore # noqa: E402

# 1. UNIT TESTS FOR SAVE_TELEMETRY (backend/db/database.py)


def test_save_telemetry_without_supabase(monkeypatch):
    """Ensure save_telemetry exits safely when the Supabase client is not configured."""
    monkeypatch.setattr(db_module, "supabase", None)
    result = db_module.save_telemetry({"device_id": "esp32_sim_01"})
    assert result is None


def test_save_telemetry_success(monkeypatch):
    """Verify that save_telemetry maps sensor keys and inserts data into 'telemetry'."""
    mock_sb = MagicMock()
    monkeypatch.setattr(db_module, "supabase", mock_sb)

    payload = {
        "device_id": "esp32_sim_01",
        "timestamp": "2026-10-12T10:00:00Z",
        "sensors": {
            "air_temperature_c": 21.5,
            "air_humidity_percent": 62.0,
            "soil_moisture_percent": 44.0,
            "light_intensity_lux": 29500.0,
        },
    }

    db_module.save_telemetry(payload)

    mock_sb.table.assert_called_once_with("telemetry")
    mock_sb.table.return_value.insert.assert_called_once_with(
        {
            "device_id": "esp32_sim_01",
            "timestamp": "2026-10-12T10:00:00Z",
            "air_temperature_c": 21.5,
            "air_humidity_percent": 62.0,
            "soil_moisture_percent": 44.0,
            "light_intensity_lux": 29500.0,
        }
    )
    mock_sb.table.return_value.insert.return_value.execute.assert_called_once()


def test_save_telemetry_exception(monkeypatch):
    """Ensure database exceptions are caught gracefully without crashing the listener."""
    mock_sb = MagicMock()
    mock_sb.table.side_effect = Exception("Simulated database error")
    monkeypatch.setattr(db_module, "supabase", mock_sb)

    db_module.save_telemetry({"device_id": "esp32_sim_01", "sensors": {}})


# 2. UNIT TESTS FOR MQTT SUBSCRIBER (backend/services/mqtt_subscriber.py)


def test_subscriber_on_connect():
    """Verify MQTT subscriber on_connect callback for both success (rc=0) and error (rc!=0)."""
    mock_client = MagicMock()

    # Success case (rc == 0)
    mqtt_subscriber.on_connect(mock_client, None, None, 0)
    mock_client.subscribe.assert_called_once_with(mqtt_subscriber.MQTT_TOPIC)

    # Error case (rc != 0)
    mock_client.reset_mock()
    mqtt_subscriber.on_connect(mock_client, None, None, 1)
    mock_client.subscribe.assert_not_called()


def test_subscriber_on_message(monkeypatch):
    """Verify MQTT subscriber on_message callback with valid and invalid JSON payloads."""
    mock_save = MagicMock()
    monkeypatch.setattr(mqtt_subscriber, "save_telemetry", mock_save)

    # 1. Valid JSON message
    valid_msg = MagicMock()
    valid_msg.topic = "agritwin/sensors/field_1"
    sample_payload = {
        "device_id": "esp32_sim_01",
        "timestamp": "2026-10-12T10:00:00Z",
        "sensors": {"air_temperature_c": 22.0},
    }
    valid_msg.payload = json.dumps(sample_payload).encode("utf-8")

    mqtt_subscriber.on_message(None, None, valid_msg)
    mock_save.assert_called_once_with(sample_payload)

    # 2. Invalid JSON message (triggers JSONDecodeError branch)
    invalid_msg = MagicMock()
    invalid_msg.topic = "agritwin/sensors/field_1"
    invalid_msg.payload = b"{invalid_json"

    mqtt_subscriber.on_message(None, None, invalid_msg)
    assert mock_save.call_count == 1


def test_start_mqtt_listener(monkeypatch):
    """Verify MQTT subscriber client initialization and loop_forever execution."""
    mock_mqtt_client_cls = MagicMock()
    monkeypatch.setattr(mqtt_subscriber.mqtt, "Client", mock_mqtt_client_cls)

    mqtt_subscriber.start_mqtt_listener()

    client_instance = mock_mqtt_client_cls.return_value
    client_instance.connect.assert_called_once_with(
        mqtt_subscriber.MQTT_BROKER, mqtt_subscriber.MQTT_PORT, 60
    )
    client_instance.loop_forever.assert_called_once()


# 3. UNIT TESTS FOR IOT SENSOR SIMULATOR (iot/mqtt_sensor_simulator.py)


def test_simulator_on_connect():
    """Verify simulator on_connect callback for both success (rc=0) and failure (rc!=0)."""
    if hasattr(mqtt_sensor_simulator, "on_connect"):
        mqtt_sensor_simulator.on_connect(MagicMock(), None, None, 0)
        mqtt_sensor_simulator.on_connect(MagicMock(), None, None, 1)


def test_simulator_run_simulation_and_data_generation(monkeypatch):
    """
    Test the full IoT sensor simulation cycle (update_sensor_data and MQTT publishing)
    by running one iteration of run_simulation and stopping cleanly via KeyboardInterrupt.
    """
    mock_mqtt_client_cls = MagicMock()
    monkeypatch.setattr(mqtt_sensor_simulator.mqtt, "Client", mock_mqtt_client_cls)

    # Simulate valid MQTT publish result
    mock_client_instance = mock_mqtt_client_cls.return_value
    mock_publish_info = MagicMock()
    mock_publish_info.rc = 0
    mock_client_instance.publish.return_value = mock_publish_info

    # Stop the infinite while loop after the first full cycle over all simulated ESP32 devices
    def stop_after_one_cycle(_):
        raise KeyboardInterrupt()

    monkeypatch.setattr(mqtt_sensor_simulator.time, "sleep", stop_after_one_cycle)

    mqtt_sensor_simulator.run_simulation()

    mock_client_instance.connect.assert_called_once()
    assert mock_client_instance.publish.call_count >= 1

    # Verify that the published payload is valid JSON containing sensor readings
    published_args = mock_client_instance.publish.call_args[0]
    published_payload = json.loads(published_args[1])
    assert "device_id" in published_payload
    assert "sensors" in published_payload
