import os
from unittest.mock import MagicMock

# Set a fallback database URL for CI environments before importing db.database
os.environ.setdefault("LOCAL_DATABASE_URL", "postgresql+asyncpg://user:pass@localhost:5432/testdb")

import db.database as db_module  # noqa: E402
from services import device_status_monitor as monitor_module  # noqa: E402
from services.device_status_monitor import DeviceStatusMonitor  # noqa: E402


class FakeClock:
    """Manual clock: the tests move the time forward without waiting."""

    def __init__(self, start: float = 1000.0):
        self.now = start

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


def make_monitor(monkeypatch, db_status: dict[str, bool]):
    """Builds a monitor with a fake clock and a fake 'devices' table."""
    clock = FakeClock()
    monitor = DeviceStatusMonitor(timeout=15, check_interval=5, clock=clock)

    monkeypatch.setattr(monitor_module, "get_devices_status", lambda: dict(db_status))
    mock_set = MagicMock(return_value=True)
    monkeypatch.setattr(monitor_module, "set_device_battery_status", mock_set)

    return monitor, clock, mock_set


# 1. DEVICE STATUS MONITOR (backend/services/device_status_monitor.py)


def test_device_sending_data_is_set_online(monkeypatch):
    """A device that sends data is marked True (board on and connected)."""
    monitor, clock, mock_set = make_monitor(monkeypatch, {"esp32_sim_01": False})

    monitor.register_message("esp32_sim_01")
    clock.advance(5)

    assert monitor.check_devices() == {"esp32_sim_01": True}
    mock_set.assert_called_once_with("esp32_sim_01", True)


def test_device_without_data_after_timeout_is_set_offline(monkeypatch):
    """A device that stops sending data for more than the timeout is marked False."""
    monitor, clock, mock_set = make_monitor(monkeypatch, {"esp32_sim_01": True})

    monitor.register_message("esp32_sim_01")
    clock.advance(16)

    assert monitor.check_devices() == {"esp32_sim_01": False}
    mock_set.assert_called_once_with("esp32_sim_01", False)


def test_device_within_timeout_stays_online(monkeypatch):
    """A short delay (e.g. one lost message) does not change the status."""
    monitor, clock, mock_set = make_monitor(monkeypatch, {"esp32_sim_01": True})

    monitor.register_message("esp32_sim_01")
    clock.advance(10)

    assert monitor.check_devices() == {}
    mock_set.assert_not_called()


def test_never_seen_device_waits_for_grace_period(monkeypatch):
    """Right after the backend starts, a silent device is not marked offline yet."""
    monitor, clock, mock_set = make_monitor(monkeypatch, {"esp32_sim_01": True})

    clock.advance(10)
    assert monitor.check_devices() == {}
    mock_set.assert_not_called()

    clock.advance(10)
    assert monitor.check_devices() == {"esp32_sim_01": False}
    mock_set.assert_called_once_with("esp32_sim_01", False)


def test_database_is_written_only_when_status_changes(monkeypatch):
    """Devices whose status did not change are not updated again."""
    monitor, clock, mock_set = make_monitor(
        monkeypatch, {"esp32_sim_01": True, "esp32_sim_02": False}
    )

    monitor.register_message("esp32_sim_01")
    clock.advance(20)

    # esp32_sim_01 changes (True -> False); esp32_sim_02 was already False
    assert monitor.check_devices() == {"esp32_sim_01": False}
    mock_set.assert_called_once_with("esp32_sim_01", False)


def test_failed_update_is_not_reported_as_change(monkeypatch):
    """If the database update fails, the change is not returned."""
    monitor, clock, mock_set = make_monitor(monkeypatch, {"esp32_sim_01": False})
    mock_set.return_value = False

    monitor.register_message("esp32_sim_01")

    assert monitor.check_devices() == {}


def test_register_message_ignores_empty_device_id():
    """Messages without a device_id are ignored."""
    monitor = DeviceStatusMonitor(clock=FakeClock())

    monitor.register_message(None)
    monitor.register_message("")

    assert monitor.is_online("esp32_sim_01", 1000.0) is None


def test_run_checks_devices_until_stopped():
    """run() calls check_devices() periodically and ends after stop()."""
    monitor = DeviceStatusMonitor(check_interval=0.01)
    calls = []

    def fake_check():
        calls.append(1)
        if len(calls) == 1:
            raise Exception("Simulated error")  # the loop must survive an error
        monitor.stop()

    monitor.check_devices = fake_check
    monitor.run()

    assert len(calls) == 2


def test_start_runs_monitor_in_background_thread():
    """start() launches a daemon thread that stops when stop() is called."""
    monitor = DeviceStatusMonitor(check_interval=0.01)
    monitor.check_devices = MagicMock(return_value={})

    thread = monitor.start()
    assert thread.daemon is True

    monitor.stop()
    thread.join(timeout=1)
    assert not thread.is_alive()


# 2. DATABASE FUNCTIONS (backend/db/database.py)


def test_get_devices_status_without_supabase(monkeypatch):
    monkeypatch.setattr(db_module, "supabase", None)
    assert db_module.get_devices_status() == {}


def test_get_devices_status_success(monkeypatch):
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.execute.return_value.data = [
        {"id": "esp32_sim_01", "battery_status": True},
        {"id": "esp32_sim_02", "battery_status": False},
    ]
    monkeypatch.setattr(db_module, "supabase", mock_sb)

    assert db_module.get_devices_status() == {"esp32_sim_01": True, "esp32_sim_02": False}
    mock_sb.table.assert_called_once_with("devices")
    mock_sb.table.return_value.select.assert_called_once_with("id, battery_status")


def test_get_devices_status_exception(monkeypatch):
    mock_sb = MagicMock()
    mock_sb.table.side_effect = Exception("Simulated database error")
    monkeypatch.setattr(db_module, "supabase", mock_sb)

    assert db_module.get_devices_status() == {}


def test_set_device_battery_status_without_supabase(monkeypatch):
    monkeypatch.setattr(db_module, "supabase", None)
    assert db_module.set_device_battery_status("esp32_sim_01", True) is False


def test_set_device_battery_status_success(monkeypatch):
    mock_sb = MagicMock()
    monkeypatch.setattr(db_module, "supabase", mock_sb)

    assert db_module.set_device_battery_status("esp32_sim_01", False) is True
    mock_sb.table.assert_called_once_with("devices")
    mock_sb.table.return_value.update.assert_called_once_with({"battery_status": False})
    mock_sb.table.return_value.update.return_value.eq.assert_called_once_with("id", "esp32_sim_01")


def test_set_device_battery_status_exception(monkeypatch):
    mock_sb = MagicMock()
    mock_sb.table.side_effect = Exception("Simulated database error")
    monkeypatch.setattr(db_module, "supabase", mock_sb)

    assert db_module.set_device_battery_status("esp32_sim_01", True) is False
