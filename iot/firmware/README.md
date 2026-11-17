# AgriTwin – ESP32 field node firmware

Firmware for the AgriTwin sensor board (ESP32-WROOM-32 DevKit). It reads three
sensors and sends the data to the backend with **the same MQTT topic and the
same JSON as `iot/mqtt_sensor_simulator.py`**. This is why the backend, the
database and the app work with the real board without any change.

---

## 1. What is in this folder

```
iot/firmware/
├── README.md                 documentation
├── agritwin_esp32/           Arduino sketch → becomes the program of the board
│   ├── agritwin_esp32.ino    the "brain": chooses the mode at boot
│   ├── config.h              all the settings: pins, calibration, MQTT, Bluetooth
│   ├── settings.h / .cpp     saves Wi-Fi and field id in the board memory
│   ├── sensors.h / .cpp      reads AHT (air), BH1750 (light), soil sensor
│   ├── telemetry.h / .cpp    Wi-Fi, exact time (NTP), MQTT publishing
│   ├── provisioning.h / .cpp first setup over Bluetooth
│   ├── wifi_diag.h / .cpp    Wi-Fi events and disconnect reasons on the Serial Monitor
│   └── status_led.h          blue LED patterns
└── tools/
    └── provision_ble.py      Mac script: does the Bluetooth setup instead of
                              the app, for testing
```

| Folder | Where it lives | Where it runs |
|---|---|---|
| `agritwin_esp32/` | repo (Mac + GitHub) | on the ESP32, after compilation |
| `tools/` | repo (Mac + GitHub) | on the Mac, started by hand |
| `README.md` | repo | nowhere, it is documentation |

**The files are not copied to the board**: Arduino IDE compiles the whole
`agritwin_esp32/` folder (plus the libraries) into **a single binary** and
uploads only that. Every change to a file requires uploading the firmware
again.

The folder and the `.ino` file must have **the same name**
(`agritwin_esp32`), otherwise Arduino IDE does not open the sketch.

---

## 2. How it works

At power-on the board checks whether a Wi-Fi network is saved and chooses one
of two modes.

### Setup mode (new board, no Wi-Fi saved)

- Bluetooth is on and the board is named `AgriTwin-XXXX` (last 4 digits of
  the MAC address).
- It waits for the app (or `provision_ble.py`) to send the Wi-Fi name, the
  password and the field id.
- When it receives the `connect` command it **tests** the Wi-Fi (up to 30 s,
  a new attempt every 10 s) and the Internet connection:
  - if it works → it saves everything and reboots in normal mode;
  - if it fails → it answers with an error and keeps waiting.
- Every 5 seconds it prints the sensor readings on the Serial Monitor: useful
  to test the wiring even without Wi-Fi.

### Normal mode (Wi-Fi saved)

- It connects to the Wi-Fi, gets the exact time from the Internet and connects
  to the MQTT broker.
- Every 5 seconds it reads the sensors and publishes the data on
  `agritwin/sensors/field_<field_id>`.
- If the Wi-Fi is missing at boot or drops later (router switched off, phone
  hotspot asleep) it starts a new attempt every 10 seconds, without losing the
  settings.
- Bluetooth stays off, also after a power cycle.

### First setup flow

```
 App / provision_ble.py                ESP32 (setup mode, slow LED blink)
  │  BLE scan "AgriTwin-XXXX"   ─────────►  advertises service 422285f2-0000-…
  │  read INFO                  ◄─────────  {"device_id":"esp32_A1B2C3D4E5F6",...}
  │  write SSID, PASSWORD, FIELD_ID ─────►  kept in temporary memory
  │  write COMMAND "connect"    ─────────►  tests Wi-Fi + MQTT broker
  │  receive STATUS             ◄─────────  connecting → connected | error:...
  │                                         saves to memory, reboots
                                            normal mode, steady LED,
                                            data every 5 s
```

### The 6 Bluetooth characteristics

| Name | UUID | Type | Content |
|---|---|---|---|
| INFO | `422285f2-0001-…` | read | JSON with `device_id`, `serial`, `fw`, `model` |
| SSID | `422285f2-0002-…` | write | Wi-Fi name (2.4 GHz only) |
| PASSWORD | `422285f2-0003-…` | write | Wi-Fi password (cannot be read back) |
| FIELD_ID | `422285f2-0004-…` | write | field id in the backend, e.g. `"3"` |
| COMMAND | `422285f2-0005-…` | write | `"connect"` |
| STATUS | `422285f2-0006-…` | read + notify | status, see the table below |

The UUIDs must be **identical** in `config.h`, in `tools/provision_ble.py` and
in the app (`agritwin-app/src/services/bleProvisioning.ts`). The app flow is
documented in [`docs/add-device.md`](../../docs/add-device.md).

| STATUS | Meaning |
|---|---|
| `waiting` | ready, nothing received yet |
| `connecting` | testing the Wi-Fi |
| `connected` | Wi-Fi and Internet OK, settings saved, the board reboots |
| `error:missing_data` | Wi-Fi name or field id missing |
| `error:bad_field_id` | the field id is not a positive number |
| `error:wifi_not_found` | network not found (the ESP32 only sees **2.4 GHz**, see section 10) |
| `error:wrong_password` | wrong password |
| `error:wifi_timeout` | the router did not answer in time |
| `error:no_internet` | Wi-Fi OK but the MQTT broker is not reachable |

### Blue LED on the board

| LED | Meaning |
|---|---|
| slow blink (1 s) | setup mode, waiting for the app |
| fast blink | connecting to Wi-Fi or MQTT |
| steady on | connected, sending data |

### Reset

Hold the **BOOT** button for **5 seconds**: the settings are erased and the
board goes back to setup mode. Use it when the router, the password or the
field changes.

### JSON sent

Identical to the simulator. A sensor that does not answer is sent as `null`.

```json
{
  "device_id": "esp32_A1B2C3D4E5F6",
  "timestamp": "2026-11-04T15:20:00Z",
  "sensors": {
    "air_temperature_c": 21.40,
    "air_humidity_percent": 55.20,
    "soil_moisture_percent": 43.00,
    "light_intensity_lux": 312.00
  }
}
```

---

## 3. Hardware and wiring

| Sensor | Measures | Connection |
|---|---|---|
| AHT20 / AHT10 | air temperature and humidity | I2C, address 0x38 |
| BH1750 (GY-302) | light (lux) | I2C, address 0x23 |
| Capacitive Soil Moisture v1.x | soil moisture | analog |

Prototype wiring (values already set in `config.h`):

| Sensor pin | ESP32 pin | Change from the first drawing |
|---|---|---|
| AHT SDA | GPIO 14 | – |
| AHT SCL | **GPIO 13** | was GPIO 12 |
| BH1750 SDA | GPIO 26 | – |
| BH1750 SCL | GPIO 25 | – |
| Soil AOUT | **GPIO 34** | was GPIO 27 |
| BH1750 ADDR | not connected | – |
| all GND | GND | – |
| all VCC / VIN | 5V **only after the check below**, otherwise 3V3 | – |

AHT and BH1750 are on different pins: the firmware automatically uses the
second I2C controller of the ESP32 for the BH1750.

### Why two pins were moved

| First drawing | Problem |
|---|---|
| Soil AOUT on GPIO 27 | GPIO 27 is an **ADC2** pin: according to the Espressif documentation, analog reads fail while Wi-Fi is on. The soil value would be wrong. |
| AHT SCL on GPIO 12 | GPIO 12 is a **strapping pin**: at power-on the ESP32 reads it to choose the flash voltage. The pull-up of the AHT module keeps it HIGH and the board may not boot. |

GPIO 25, 26, 14 and 13 are ADC2 pins too, but the limit only applies to
analog reads: I2C is digital and works.

Sources:
- [Espressif ESP-FAQ – ADC](https://docs.espressif.com/projects/esp-faq/en/latest/software-framework/peripherals/adc.html)
- [esptool – Set Flash Voltage (GPIO12 / MTDI)](https://docs.espressif.com/projects/esptool/en/latest/esp32/espefuse/set-flash-voltage-cmd.html)

### 5V check (ESP32 pins are 3.3 V only)

With a multimeter, power each sensor from 5V **without** connecting it to the
ESP32 and measure against GND:

| Measure | OK at 5V if | Otherwise |
|---|---|---|
| AHT SDA and SCL | about 3.3 V | power the AHT from 3V3 |
| BH1750 SDA and SCL | about 3.3 V | power the BH1750 from 3V3 |
| Soil AOUT, sensor in open air | below 3.1 V | power the soil sensor from 3V3 |

Powering everything from 3V3 always works and makes the check unnecessary. If
the soil sensor is moved to 3V3, calibrate it again (section 8).

---

## 4. Install the tools on the Mac

### Option A – Arduino IDE 2 (recommended to start)

1. Download and install Arduino IDE 2 from arduino.cc.
2. **Arduino IDE → Settings → Additional boards manager URLs**, paste:
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
3. **Boards Manager** (left icon) → search `esp32` → install
   **esp32 by Espressif Systems**, version 3.x.
4. **Library Manager** → install:
   - **NimBLE-Arduino** by h2zero (version 2.x)
   - **PubSubClient** by Nick O'Leary
   - **Adafruit AHTX0** by Adafruit → when it asks for the dependencies choose
     **Install all**
   - **BH1750** by Christopher Laws

### Option B – terminal

```bash
brew install arduino-cli
arduino-cli config init
arduino-cli config add board_manager.additional_urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli core update-index
arduino-cli core install esp32:esp32
arduino-cli lib install "NimBLE-Arduino" "PubSubClient" "Adafruit AHTX0" "BH1750"
```

### USB driver

Connect the board with a USB **data** cable (some cables are charge-only) and
check:

```bash
ls /dev/cu.*
```

A port like `/dev/cu.usbserial-0001`, `/dev/cu.SLAB_USBtoUART` or
`/dev/cu.wchusbserial…` must appear. If nothing appears, install the driver of
the USB chip of the board: **Silicon Labs CP210x** or **WCH CH34x** (the name
is printed on the chip next to the USB socket).

---

## 5. Upload the firmware to the board

Done once per board, "in the factory", and again only when the code changes.

### With Arduino IDE

1. Open `iot/firmware/agritwin_esp32/agritwin_esp32.ino` (the other files open
   as tabs).
2. **Tools → Board → esp32 → ESP32 Dev Module**
3. **Tools → Partition Scheme → Minimal SPIFFS (1.9MB APP with OTA)**
4. **Tools → Port →** the port found with `ls /dev/cu.*`
5. Press **Upload** (→ arrow).
6. Open **Tools → Serial Monitor** and set **115200 baud**.

### With the terminal

```bash
cd ~/path/to/AGRITWIN/iot/firmware
arduino-cli compile --fqbn esp32:esp32:esp32:PartitionScheme=min_spiffs agritwin_esp32
arduino-cli upload  --fqbn esp32:esp32:esp32:PartitionScheme=min_spiffs -p /dev/cu.usbserial-0001 agritwin_esp32
arduino-cli monitor -p /dev/cu.usbserial-0001 -c baudrate=115200
```

Why "Minimal SPIFFS": with the default scheme the firmware already uses 93% of
the space and there would be no room for future over-the-air (OTA) updates.
With this scheme it uses 62%.

If the upload stays on `Connecting.....`, hold **BOOT** on the board until it
starts writing.

---

## 6. First test: the sensors (no Wi-Fi)

After the upload the board is new, so it starts in setup mode. The Serial
Monitor must show:

```text
=== AgriTwin node esp32_A1B2C3D4E5F6 | fw 0.1.1 ===
[BOOT] no Wi-Fi saved -> Bluetooth setup mode
[SETUP] Bluetooth setup mode, advertising as AgriTwin-E5F6
[SETUP] device id: esp32_A1B2C3D4E5F6
[SENSORS] air 21.4 | hum 55.2 | soil 43.0 (raw 2269) | light 312
[SENSORS] air 21.4 | hum 55.3 | soil 43.1 (raw 2267) | light 309
```

**Write down the `device_id`**: it is needed in the next step.

Quick checks:
- breathe on the AHT → humidity goes up;
- cover the BH1750 with your hand → light goes down;
- touch or wet the soil sensor → the percentage changes.

A `--` value means that the sensor does not answer (see section 10).

---

## 7. Bluetooth setup with `tools/provision_ble.py`

The script does from the Mac **exactly what the app will do**. Use it to test
the board until the app screen is ready, and afterwards to find out whether a
problem is in the board or in the app.

### 7.1 Before starting

1. **The field must exist** in the app. You need its **numeric id**: find it in
   Supabase, table `fields`, column `id`.
2. **Register the board in the backend** before it starts sending data,
   because the `telemetry` table only accepts a `device_id` that already exists
   in `devices`. The script does not do it (the app **Add device** flow does it
   automatically, see [`docs/add-device.md`](../../docs/add-device.md)). From
   the app: open the field → **edit** → add a device with:
   - id: the `device_id` read in step 6, e.g. `esp32_A1B2C3D4E5F6`
   - brand: `AgriTwin`
   - serial number: the 12 digits after `esp32_`, e.g. `A1B2C3D4E5F6`
3. **Start the backend MQTT subscriber** in a terminal, to see the data
   arriving and save it in the database:
   ```bash
   cd ~/path/to/AGRITWIN/backend
   uv run python -m services.mqtt_subscriber
   ```
4. The board must be in setup mode: **slow** blinking LED. If it is steady it
   is already configured → hold BOOT for 5 seconds.
5. The Wi-Fi must be **2.4 GHz**. Many routers have two networks (e.g.
   `HomeWiFi` and `HomeWiFi_5G`): use the one without `5G`.

### 7.2 The Bluetooth library

The script needs `bleak`. With `uv run --with bleak` (below) `uv` downloads it
in a temporary environment, so nothing has to be installed and the backend
environment stays clean.

### 7.3 Run the script

In a **second** terminal:

```bash
cd ~/path/to/AGRITWIN/iot/firmware/tools
uv run --no-project --with bleak python provision_ble.py --ssid "WiFiName" --password "WiFiPassword" --field 1
```

| Option | Required | Meaning |
|---|---|---|
| `--ssid` | yes | Wi-Fi name (case and spaces matter, use quotes) |
| `--password` | no (empty for an open network) | Wi-Fi password |
| `--field` | yes | field id in the backend |
| `--scan-timeout` | no (default 8) | seconds spent searching for the board |

The first time, macOS asks for Bluetooth permission for **Terminal** (or
**Visual Studio Code**, if you use its terminal): click **Allow**. If you
denied it: **System Settings → Privacy & Security → Bluetooth**, enable it for
that app, then close and reopen the terminal.

### 7.4 What you must see

In the script terminal:

```text
[SCAN] looking for AgriTwin boards for 8s ...
  [0] AgriTwin-E5F6  (3F2A9C1B-....)
[BLE] connecting to AgriTwin-E5F6 ...
[BLE] device id: esp32_A1B2C3D4E5F6  firmware: 0.1.1
[BLE] settings sent, waiting for the board to test the Wi-Fi ...
[BOARD] connecting
[BOARD] connected

[OK] Board configured. It reboots and starts sending data.
     Register it in the app/backend with device id: esp32_A1B2C3D4E5F6
```

On macOS a long code is shown instead of the MAC address: this is normal,
macOS hides the real Bluetooth addresses.

In the Serial Monitor, after the reboot:

```text
[BOOT] normal mode, field 1
[WIFI] connecting to "WiFiName"
[WIFI] connected, IP 192.168.1.23
[MQTT] connecting to broker.hivemq.com:1883 ...
[MQTT] connected, publishing on agritwin/sensors/field_1
[SENSORS] air 21.4 | hum 55.2 | soil 43.0 (raw 2269) | light 312
[MQTT] -> {"device_id":"esp32_A1B2C3D4E5F6","timestamp":"2026-11-04T15:20:00Z",...}
```

In the subscriber terminal:

```text
[BACKEND-RECEIVE] New data intercepted on topic: agritwin/sensors/field_1
[DATABASE-SUCCESS] Telemetry data from esp32_A1B2C3D4E5F6 saved to Supabase!
[DEVICE-STATUS] esp32_A1B2C3D4E5F6 -> ONLINE
```

In the Serial Monitor, while the board tests the Wi-Fi during the setup:

```text
[SETUP] status -> connecting
[SETUP] Wi-Fi attempt 1 to "WiFiName"
[WIFI] associated with the access point, waiting for IP...
[WIFI] got IP 172.20.10.2
[SETUP] Wi-Fi OK, IP 172.20.10.2
[SETUP] status -> connected
```

If an error appears, the board stays in setup mode: fix the value and run the
script again. The `[WIFI] disconnected, reason …` lines tell why (section 10).

### 7.5 (Optional) See the MQTT messages without the backend

```bash
brew install mosquitto
mosquitto_sub -h broker.hivemq.com -t "agritwin/sensors/#" -v
```

---

## 8. Soil sensor calibration

Every capacitive sensor gives slightly different values, so the values in
`config.h` must be adapted to yours.

1. Look at the `raw` value on the Serial Monitor (it is also shown in setup
   mode).
2. Sensor **in open air** → write the value in `SOIL_RAW_DRY`.
3. Sensor **in a glass of water** up to the white line → write the value in
   `SOIL_RAW_WET`.
4. Upload the firmware again.

The sensor gives **higher values when it is dry**: this is normal.

---

## 9. Changing the firmware

| I want to… | File | What to change |
|---|---|---|
| move a sensor to another pin | `config.h` | `*_PIN` |
| change how often data is sent | `config.h` | `TELEMETRY_INTERVAL_MS` (max 15000: the backend marks the board offline after 15 s) |
| change broker or topic | `config.h` + `backend/services/mqtt_subscriber.py` | they must stay identical |
| add a sensor | `sensors.*` + `telemetry.cpp` (JSON) + backend (`save_telemetry`, `telemetry` table) | |

After every change increase `FIRMWARE_VERSION` in `config.h` and upload again.

---

## 10. Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| No port in `ls /dev/cu.*` | charge-only cable or missing driver | change cable, install CP210x / CH34x |
| Upload stuck on `Connecting.....` | the board does not enter upload mode | hold BOOT during the upload |
| The board does not boot, `flash read err` | a sensor is still on GPIO 12 | move the wire to GPIO 13 |
| `[SENSORS] BH1750 not found` | SDA and SCL swapped or loose wire | swap `BH1750_SDA_PIN` and `BH1750_SCL_PIN` in `config.h` |
| `[SENSORS] AHT not found` | same as above | check the wires on 14 / 13 and the power |
| Soil always 0% or 100% | wrong calibration | repeat section 8 |
| Soil `--` | AOUT disconnected or on the wrong pin | check the wire on GPIO 34 |
| The script does not find the board | board already configured or Bluetooth permission denied | reset with BOOT 5 s; check the permission (7.3) |
| `error:wifi_not_found` | 5 GHz network, wrong name or too far | use the 2.4 GHz network, check the exact name, move the board closer |
| `error:wifi_not_found` with an **iPhone hotspot** | "Maximize Compatibility" is off, so the hotspot uses 5 GHz | iPhone: **Settings → Personal Hotspot → Maximize Compatibility ON**, switch "Allow Others to Join" off and on, keep that screen open while the board connects |
| The board finds the hotspot only sometimes | phone hotspots hide themselves when the phone is locked or nobody is connected | keep the hotspot screen open; for demos prefer a router or an Android hotspot set to 2.4 GHz |
| `error:no_internet` | the Wi-Fi blocks port 1883 (university/company networks) | try the phone hotspot |
| Data sent but `[DATABASE-ERROR]` in the subscriber | board not registered in `devices` | register it from the app (7.1, point 2) |
| University networks (e.g. eduroam) | they need a personal username and password (WPA2-Enterprise) | not supported: use a router or a phone hotspot |

### Wi-Fi disconnect reasons

The firmware prints `[WIFI] disconnected, reason N (NAME)` on the Serial
Monitor. The most common ones:

| Reason | Meaning |
|---|---|
| 8, 36 | the board closed the attempt itself before a new one: ignore |
| 201, 210, 211 | network not found or not compatible (5 GHz, WPA3 only, wrong name) |
| 15, 202, 204 | wrong password |
| 200 | signal lost (board too far) |
| 212 | signal too weak |
| `associated … waiting for IP` with no `got IP` | the network accepted the board but did not give it an address |

---

