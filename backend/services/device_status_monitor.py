"""
Device status monitor (devices.battery_status).

A board with an empty battery or without Internet cannot report its own
status, so the backend decides it from the telemetry it receives:

    * the board sent data in the last OFFLINE_TIMEOUT_SECONDS -> True
      (board on and connected)
    * no data for more than OFFLINE_TIMEOUT_SECONDS           -> False
      (battery empty OR board not connected to the Internet)

The MQTT subscriber calls register_message() for every message received and
a background thread runs check_devices() every CHECK_INTERVAL_SECONDS.
The database is only written when the status of a device changes.
"""

import threading
import time

from db.database import get_devices_status, set_device_battery_status

# The boards send data every ~5 seconds. A board is marked offline after
# missing about 3 transmissions, so one lost message does not change the status.
OFFLINE_TIMEOUT_SECONDS = 15

# How often the registered devices are checked.
CHECK_INTERVAL_SECONDS = 5


class DeviceStatusMonitor:
    def __init__(
        self,
        timeout: float = OFFLINE_TIMEOUT_SECONDS,
        check_interval: float = CHECK_INTERVAL_SECONDS,
        clock=time.monotonic,
    ):
        self._timeout = timeout
        self._check_interval = check_interval
        # Injectable clock so the tests do not have to wait real seconds
        self._clock = clock
        self._started_at = clock()
        # device_id -> clock() value of the last message received
        self._last_seen: dict[str, float] = {}
        # register_message() runs in the MQTT thread, check_devices() in the monitor thread
        self._lock = threading.Lock()
        self._stop_event = threading.Event()

    def register_message(self, device_id: str | None) -> None:
        """Stores the time of the last message received from a device."""
        if not device_id:
            return
        with self._lock:
            self._last_seen[device_id] = self._clock()

    def is_online(self, device_id: str, now: float) -> bool | None:
        """
        Returns True/False for the device, or None when it is still too early to decide
        (no message received yet and the monitor started less than 'timeout' seconds ago).
        """
        with self._lock:
            seen_at = self._last_seen.get(device_id)

        if seen_at is None:
            if now - self._started_at <= self._timeout:
                return None
            return False

        return now - seen_at <= self._timeout

    def check_devices(self) -> dict[str, bool]:
        """
        Compares every registered device with the time of its last message and
        updates battery_status in the database only when it changes.
        Returns the devices whose status was changed.
        """
        now = self._clock()
        changes = {}

        for device_id, current_status in get_devices_status().items():
            online = self.is_online(device_id, now)
            if online is None or online == current_status:
                continue

            if set_device_battery_status(device_id, online):
                changes[device_id] = online
                label = "ONLINE" if online else "OFFLINE (battery empty or no Internet)"
                print(f"[DEVICE-STATUS] {device_id} -> {label}")

        return changes

    def run(self) -> None:
        """Checks the devices every check_interval seconds until stop() is called."""
        while not self._stop_event.wait(self._check_interval):
            try:
                self.check_devices()
            except Exception as e:
                # Never stop the monitor because of a single failed check
                print(f"[DEVICE-STATUS-ERROR] Error checking devices: {e}")

    def start(self) -> threading.Thread:
        """Starts the monitor in a background thread."""
        thread = threading.Thread(target=self.run, name="DeviceStatusMonitor", daemon=True)
        thread.start()
        print(
            f"[DEVICE-STATUS] Monitor started (offline after {self._timeout}s without data, "
            f"check every {self._check_interval}s)"
        )
        return thread

    def stop(self) -> None:
        """Stops the background thread."""
        self._stop_event.set()
