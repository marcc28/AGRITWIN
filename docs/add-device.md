# Add a device to a field

Related work: #159, #160, #161, #162 and #163.

## Scope

A farmer connects a new AgriTwin board (ESP32) to their Wi-Fi and links it to a
field directly from the phone app. The farmer only types the **Wi-Fi name** and
the **password**. Everything else is filled in automatically:

| Value                                             | Source                                                      |
| ------------------------------------------------- | ----------------------------------------------------------- |
| Field id                                          | The field screen that opened the flow                       |
| Device id, serial number, model, firmware version | Read from the board over Bluetooth LE (INFO characteristic) |
| Brand                                             | Always `AgriTwin`                                           |

The flow starts from the **Add device** button in the devices card of the field
screen (`field-detail.tsx`). It runs only in the Android/iOS app, because
browsers cannot use Bluetooth LE: the web version of `/add-device` shows a
message asking the user to open the phone app.

The Wi-Fi name and password are sent only to the board. The app and the backend
do not store them.

## User flow

1. **Find your board.** The app asks for the Bluetooth permission, checks that
   Bluetooth is on and scans for 8 seconds. Boards in setup mode appear live in
   the list as `AgriTwin-XXXX` (last 4 hex digits of the MAC address).
2. **Choose the board.** Tapping a board stops the scan, connects to it and reads
   its identity. If no board is found, the screen explains how to put the board
   in setup mode and offers **Try again**.
3. **Connect the board to Wi-Fi.** The user enters the Wi-Fi name and password.
   The screen reminds them that only 2.4 GHz networks work.
4. **Connecting.** The board tests the Wi-Fi and the connection to the MQTT
   broker. This can take about 20 seconds.
5. **Saving the board.** When the board answers `connected`, the app registers it
   in the backend for the selected field.
6. **Board connected.** The board reboots in normal mode (steady blue LED) and
   starts sending telemetry every 5 seconds. **Back to the field** returns to the
   field screen, where the new device appears in the list.

If something fails, an error screen explains the cause and **Try again** goes
back only to the part that failed (see [Errors](#errors-and-retry)).

## Technical implementation

### Architecture

```text
field-detail.tsx ──"Add device"──► add-device.tsx (?id=<fieldId>)
                                        │
                                        ▼
                           DeviceSetupScreen + ScanSteps / WifiSteps / ResultSteps
                                        │  reads `step`, calls actions
                                        ▼
                           useBleProvisioning(fieldId)        (state machine)
                                        │
                ┌───────────────────────┴───────────────────────┐
                ▼                                               ▼
     services/bleProvisioning.ts                         services/api.ts
     (react-native-ble-plx)                              getField(), createDevice()
                │ Bluetooth LE                                  │ HTTPS + JWT
                ▼                                               ▼
     ESP32 firmware (setup mode)                   POST /api/v1/fields/{id}/devices
                                                                │
                                                                ▼
                                                        `devices` table
```

### Frontend files

| File                                | Role                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/app/add-device.tsx`            | Route of the flow. Reads the field id from the URL and starts the scan.                  |
| `src/app/add-device.web.tsx`        | Web version: explains that the flow needs the phone app.                                 |
| `src/components/device-setup/*`     | Screens: scan, board list, Wi-Fi form, progress, success and error.                      |
| `src/hooks/use-ble-provisioning.ts` | State machine of the flow and retry logic. `use-device-setup.ts` re-exports it.          |
| `src/services/bleProvisioning.ts`   | Bluetooth protocol: scan, connect, read INFO, write settings, wait for STATUS, register. |
| `src/services/bleManager.ts`        | Single shared `BleManager` (react-native-ble-plx allows only one).                       |
| `src/services/blePermissions.ts`    | Android runtime permissions.                                                             |
| `src/services/bleEncoding.ts`       | UTF-8 text ↔ Base64 conversion used by react-native-ble-plx.                             |

### State machine

```text
idle ─startScan→ scanning ─┬→ boardList ─selectBoard→ connecting → wifiForm
                           └→ noBoards                                 │
                                                             submitWifi │
success ← registering ← provisioning ←─────────────────────────────────┘
any failure → error ─retry→ back to the step that failed
```

Leaving the screen stops the scan and closes the Bluetooth connection. If the
user taps a board while the scan is still running, the late scan result is
ignored so the board list does not come back.

### Bluetooth protocol

The app uses the protocol documented in
[`iot/firmware/README.md`](../iot/firmware/README.md#2-how-it-works). The UUIDs
must stay identical in `iot/firmware/agritwin_esp32/config.h`,
`iot/firmware/tools/provision_ble.py` and `src/services/bleProvisioning.ts`.

| Characteristic | UUID                                   | App action                                          |
| -------------- | -------------------------------------- | --------------------------------------------------- |
| Service        | `422285f2-0000-4631-a335-64b1ab75567c` | Scan filter                                         |
| INFO           | `422285f2-0001-…`                      | Read JSON `{device_id, serial, fw, model}`          |
| SSID           | `422285f2-0002-…`                      | Write the Wi-Fi name                                |
| PASSWORD       | `422285f2-0003-…`                      | Write the Wi-Fi password                            |
| FIELD_ID       | `422285f2-0004-…`                      | Write the field id, e.g. `"3"`                      |
| COMMAND        | `422285f2-0005-…`                      | Write `"connect"`                                   |
| STATUS         | `422285f2-0006-…`                      | Notify: `connecting`, `connected` or `error:<code>` |

The app subscribes to STATUS **before** writing, so no status is missed. It
requests an MTU of 256 bytes so the SSID and the password fit in one write each.

| Timeout      | Value | Reason                                                 |
| ------------ | ----- | ------------------------------------------------------ |
| Scan         | 8 s   | Time to find boards nearby                             |
| Connection   | 10 s  | Bluetooth connection and INFO read                     |
| Board answer | 40 s  | The board tests the Wi-Fi (up to ~30 s) and the broker |

### Permissions

| Platform              | Permission                                                            |
| --------------------- | --------------------------------------------------------------------- |
| Android 12+ (API 31+) | `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT` ("Nearby devices")           |
| Android 11 and lower  | `ACCESS_FINE_LOCATION`, required by the system for any Bluetooth scan |
| iOS                   | Asked by the system on first use; the text comes from `app.json`      |

The `react-native-ble-plx` config plugin in `app.json` sets
`neverForLocation: true` and disables background mode.

## Backend endpoint

### `POST /api/v1/fields/{field_id}/devices`

Registers a device in a field of the authenticated user. Implemented in
`backend/api/v1/fields.py` (`create_device`).

Request (JWT required in `Authorization: Bearer <token>`):

```json
{
  "id": "esp32_A1B2C3D4E5F6",
  "brand": "AgriTwin",
  "serial_number": "A1B2C3D4E5F6"
}
```

Response `200`:

```json
{
  "id": "esp32_A1B2C3D4E5F6",
  "battery_status": false,
  "brand": "AgriTwin",
  "serial_number": "A1B2C3D4E5F6"
}
```

`battery_status` starts as `false`. The device status monitor sets it to `true`
when the first telemetry message from the board arrives.

| Status | When                                                               |
| ------ | ------------------------------------------------------------------ |
| `400`  | `id`, `brand` or `serial_number` is empty after trimming           |
| `401`  | Missing or invalid token                                           |
| `404`  | The field does not exist or belongs to another user                |
| `409`  | `This device is already registered` (same `id` or `serial_number`) |

The same router also provides `PUT` and `DELETE`
`/api/v1/fields/{field_id}/devices/{device_id}` to edit or remove a device.

### Registration logic in the app

Before calling the endpoint, `registerBoard()` reads the field with
`GET /api/v1/fields/{id}`:

- If the device is **already in this field**, the app skips the POST and shows
  "This board was already linked to this field". This is the normal case after
  a factory reset of the board.
- Otherwise it calls the POST. A `409` means the board belongs to **another
  field** and the app shows "This board is already in another field".

### Database

The row is stored in the existing `devices` table (`backend/db/schema.py`). No
migration was needed.

| Column           | Value                                                            |
| ---------------- | ---------------------------------------------------------------- |
| `id`             | Device id read from the board, primary key                       |
| `field_id`       | Field that opened the flow, foreign key with `ON DELETE CASCADE` |
| `brand`          | `AgriTwin`                                                       |
| `serial_number`  | Read from the board, unique                                      |
| `battery_status` | `false` until the first telemetry message                        |

The model and firmware version are read from the board but are not stored,
because the `devices` table has no columns for them.

## Errors and retry

| Code                           | Cause                                                              | Retry goes back to |
| ------------------------------ | ------------------------------------------------------------------ | ------------------ |
| `bluetooth_off`                | Bluetooth is off on the phone                                      | Scan               |
| `permission_denied`            | Bluetooth permission denied (an **Open settings** button is shown) | Scan               |
| `scan_failed`                  | The scan could not start                                           | Scan               |
| `connection_failed`            | Connection or INFO read failed                                     | Scan               |
| `connection_lost`              | The Bluetooth link dropped while sending the settings              | Wi-Fi form         |
| `no_answer`                    | The board did not answer within 40 s                               | Wi-Fi form         |
| `missing_data`, `bad_field_id` | Sent by the board: incomplete or invalid data                      | Wi-Fi form         |
| `wifi_not_found`               | Sent by the board: network not found or 5 GHz                      | Wi-Fi form         |
| `wrong_password`               | Sent by the board: wrong Wi-Fi password                            | Wi-Fi form         |
| `wifi_timeout`                 | Sent by the board: the router did not answer                       | Wi-Fi form         |
| `no_internet`                  | Sent by the board: Wi-Fi OK but the MQTT broker is unreachable     | Wi-Fi form         |
| `session_expired`              | The app has no valid login                                         | Registration       |
| `already_registered_elsewhere` | `409` from the backend                                             | Registration       |
| `registration_failed`          | Any other backend error                                            | Registration       |

When the Wi-Fi fails, the board stays in setup mode, so the user can correct the
values and press **Connect** again without scanning. If the Bluetooth link was
lost meanwhile, the app reconnects to the same board automatically.

When only the registration fails, the board is already on Wi-Fi: **Try again**
repeats only the backend call.

All messages are translated in `i18n/locales/{en,es,ca,it}.json` under
`addDevice` and `deviceSetup.errors`.

## How to test it with the board

### Requirements

- An AgriTwin board flashed with the firmware in `iot/firmware`
  (see [section 5](../iot/firmware/README.md#5-upload-the-firmware-to-the-board)).
- An Android or iOS **development build** or the APK from
  [`agritwin-app/README_APK.md`](../agritwin-app/README_APK.md).
  `react-native-ble-plx` contains native code, so the flow does **not** work in
  Expo Go or in the browser.
- The app pointing to a running backend (`EXPO_PUBLIC_API_URL`) and a user with
  at least one field.
- A **2.4 GHz** Wi-Fi network with Internet access. With an iPhone hotspot,
  enable **Maximize Compatibility**.
- Optional: the MQTT subscriber running, to see the telemetry arrive:

  ```sh
  cd backend
  uv run python -m services.mqtt_subscriber
  ```

### Put the board in setup mode

A new board starts in setup mode. If the blue LED is **steady**, the board is
already configured: hold the **BOOT** button for **5 seconds** until the LED
blinks slowly (1 s).

| LED              | Meaning                         |
| ---------------- | ------------------------------- |
| Slow blink (1 s) | Setup mode, waiting for the app |
| Fast blink       | Connecting to Wi-Fi or MQTT     |
| Steady on        | Connected, sending data         |

To follow what the board does, open the Serial Monitor at 115200 baud. In setup
mode it prints `[SETUP] Bluetooth setup mode, advertising as AgriTwin-XXXX`.

### Happy path

1. Open the app, go to the field and tap **Add device**.
2. Allow Bluetooth when asked. The board `AgriTwin-XXXX` appears in the list.
3. Tap it, enter the Wi-Fi name and password and tap **Connect**.
4. Check the Serial Monitor: `connecting`, then `connected` and a reboot.
5. The app shows **Board connected**. The LED becomes steady.
6. Go back to the field: the device is in the list and turns online after the
   first telemetry message.
7. In the database, the `devices` table has a row with the board id, the field
   id, brand `AgriTwin` and the serial number.

### Error cases

| Case                     | How to cause it                                              | Expected result                                       |
| ------------------------ | ------------------------------------------------------------ | ----------------------------------------------------- |
| No board found           | Board off or already configured                              | "We could not find any board" with the BOOT tip       |
| Bluetooth off            | Turn Bluetooth off on the phone                              | "Bluetooth is off"                                    |
| Permission denied        | Deny the Bluetooth permission                                | "Bluetooth permission is missing" + **Open settings** |
| Network not found        | Wrong name or 5 GHz network                                  | Wi-Fi error, board still in setup mode                |
| Wrong password           | Wrong Wi-Fi password                                         | Wi-Fi error, the form keeps the name                  |
| Timeout                  | Board far from the router                                    | "Time ran out"                                        |
| No Internet              | Wi-Fi without Internet                                       | "Wi-Fi connected, but no internet"                    |
| Already in this field    | Reset the board with BOOT and add it again to the same field | Success with "already linked to this field"           |
| Already in another field | Reset the board and add it to a different field              | "This board is already in another field"              |

### Without the app

`iot/firmware/tools/provision_ble.py` does the same Bluetooth steps from a Mac
(see [section 7](../iot/firmware/README.md#7-bluetooth-setup-with-toolsprovision_blepy)).
Use it to find out whether a problem is in the board or in the app. The script
does not register the device in the backend.

## Automated tests

```sh
cd agritwin-app
npx jest __tests__/unit/services/ble* __tests__/unit/hooks/use-ble-provisioning.test.ts \
  __tests__/unit/app/add-device* __tests__/unit/components/device-setup --runInBand

cd ../backend
uv run pytest tests/unit/router/test_fields_router.py -k device
```

The Bluetooth tests use a fake `BleManager`
(`__tests__/unit/helpers/fakeBleManager.ts`), so no board or phone is needed.

### Verified execution: 2026-11-12

| Suite                       | Result                      | Scope                                                                                           |
| --------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------- |
| Bluetooth services and hook | 72 tests passed in 5 suites | Encoding, permissions, scan, INFO parsing, settings write, STATUS handling, registration, retry |
| Add device screens          | 36 tests passed in 4 suites | Native and web routes, all the setup screens                                                    |
| Backend device endpoints    | 16 tests passed             | Create, update, delete, validation, authentication, not found and conflict                      |

Manual end-to-end checks with a real board are tracked in #162.


