"""
AgriTwin - Bluetooth setup tester (macOS / Linux / Windows).

Does from the computer exactly what the mobile app will do the first time a
farmer powers on a new board:
  1. scan for boards in Bluetooth setup mode ("AgriTwin-XXXX")
  2. read the device id
  3. send Wi-Fi SSID, password and field id
  4. send the "connect" command and wait for the result

Install:   pip3 install bleak
Run:       python3 provision_ble.py --ssid "MyWiFi" --password "secret" --field 3
"""

import argparse
import asyncio
import json
import sys

from bleak import BleakClient, BleakScanner

# Must match iot/firmware/agritwin_esp32/config.h
SERVICE_UUID = "422285f2-0000-4631-a335-64b1ab75567c"
CHAR_INFO = "422285f2-0001-4631-a335-64b1ab75567c"
CHAR_SSID = "422285f2-0002-4631-a335-64b1ab75567c"
CHAR_WIFI_PSK = "422285f2-0003-4631-a335-64b1ab75567c"  # Wi-Fi pre-shared key
CHAR_FIELD = "422285f2-0004-4631-a335-64b1ab75567c"
CHAR_COMMAND = "422285f2-0005-4631-a335-64b1ab75567c"
CHAR_STATUS = "422285f2-0006-4631-a335-64b1ab75567c"

FINAL_STATUSES = ("connected", "error:")

ERROR_HELP = {
    "error:missing_data": "SSID or field id missing.",
    "error:bad_field_id": "The field id must be a positive number.",
    "error:wifi_not_found": "Network not found. Is it a 2.4 GHz network and in range?",
    "error:wrong_password": "Wrong Wi-Fi password.",
    "error:wifi_timeout": "Wi-Fi did not answer in time. Retry closer to the router.",
    "error:no_internet": "Wi-Fi OK but the MQTT broker is not reachable (no Internet?).",
}


async def find_board(scan_seconds: float):
    print(f"[SCAN] looking for AgriTwin boards for {scan_seconds:.0f}s ...")
    devices = await BleakScanner.discover(timeout=scan_seconds, service_uuids=[SERVICE_UUID])
    if not devices:
        # Some macOS versions hide the service UUID: fall back to the name.
        devices = [
            d
            for d in await BleakScanner.discover(timeout=scan_seconds)
            if (d.name or "").startswith("AgriTwin-")
        ]
    if not devices:
        return None
    for index, device in enumerate(devices):
        print(f"  [{index}] {device.name}  ({device.address})")
    return devices[0]


async def provision(ssid: str, password: str, field_id: int, scan_timeout: float) -> int:
    board = await find_board(scan_timeout)
    if board is None:
        print("[ERROR] No board found. Is the blue LED blinking slowly (setup mode)?")
        return 1

    final_status = asyncio.get_running_loop().create_future()

    def on_status(_sender, data: bytearray):
        status = data.decode("utf-8", errors="replace")
        print(f"[BOARD] {status}")
        if status.startswith(FINAL_STATUSES) and not final_status.done():
            final_status.set_result(status)

    print(f"[BLE] connecting to {board.name} ...")
    async with BleakClient(board) as client:
        info = json.loads((await client.read_gatt_char(CHAR_INFO)).decode("utf-8"))
        print(f"[BLE] device id: {info['device_id']}  firmware: {info['fw']}")

        await client.start_notify(CHAR_STATUS, on_status)
        await client.write_gatt_char(CHAR_SSID, ssid.encode("utf-8"), response=True)
        await client.write_gatt_char(CHAR_WIFI_PSK, password.encode("utf-8"), response=True)
        await client.write_gatt_char(CHAR_FIELD, str(field_id).encode("utf-8"), response=True)
        await client.write_gatt_char(CHAR_COMMAND, b"connect", response=True)
        print("[BLE] settings sent, waiting for the board to test the Wi-Fi ...")

        try:
            status = await asyncio.wait_for(final_status, timeout=40)
        except TimeoutError:
            print("[ERROR] No answer from the board.")
            return 1

    if status == "connected":
        print("\n[OK] Board configured. It reboots and starts sending data.")
        print(f"     Register it in the app/backend with device id: {info['device_id']}")
        return 0

    print(f"\n[FAILED] {status}: {ERROR_HELP.get(status, 'unknown error')}")
    print("         The board stays in setup mode, you can run the script again.")
    return 1


def main() -> int:
    parser = argparse.ArgumentParser(description="AgriTwin ESP32 Bluetooth setup")
    parser.add_argument("--ssid", required=True, help="Wi-Fi network name (2.4 GHz)")
    parser.add_argument("--password", default="", help="Wi-Fi password")
    parser.add_argument("--field", type=int, required=True, help="field id in the backend")
    parser.add_argument("--scan-timeout", type=float, default=8.0)
    args = parser.parse_args()
    return asyncio.run(provision(args.ssid, args.password, args.field, args.scan_timeout))


if __name__ == "__main__":
    sys.exit(main())
