# Ksmart on ESP32 (single-file)

`Ksmart_ESP32.ino` turns an **ESP32 into a self-contained smart lock**. It hosts
the Ksmart web UI over WiFi and opens a physical door through a relay — no phone
app, no cloud, no extra files. The whole web page is embedded in `PROGMEM`, so
you flash just this one sketch.

This is the embedded counterpart of the browser app in the parent folder: here
the ESP32 *is* the lock (one door), so the phone app's multi-device BLE binding
collapses into direct GPIO control.

## Flash it

1. Arduino IDE → install **esp32** boards (Boards Manager → "esp32" by Espressif).
2. Open `Ksmart_ESP32.ino`, pick your ESP32 board, upload. No library installs
   needed (`WiFi`, `WebServer`, `Preferences` ship with the core).

## Wiring

| Signal                     | Pin        | Notes |
|----------------------------|------------|-------|
| Relay / lock driver IN     | GPIO 26    | `RELAY_PIN` |
| Status LED (optional)      | GPIO 2     | onboard LED on many boards; set `LED_PIN -1` to disable |
| Relay module VCC / GND     | 5V / GND   | — |

> Drive a solenoid/electric strike through a **relay or MOSFET module** with its
> own supply and a flyback diode — never straight off a GPIO. If your lock opens
> on the opposite level, flip `RELAY_ACTIVE` to `LOW`.

## Connect & use

- The ESP32 creates a WiFi access point:
  - SSID **`Ksmart-Lock`**, password **`ksmart123`**
- Join it, open **`http://192.168.4.1`**
- Enter the pairing code (default **`123456`**) to reach the unlock panel.
- Tap the big button to open; the relay stays energised for the **open time**
  (default 3s), then releases automatically.

Optionally join your home WiFi too: set `STA_SSID` / `STA_PASS` in the CONFIG
block (the serial monitor prints the assigned IP at boot).

## What persists

The **pairing code** and **open time** are stored in NVS (`Preferences`) and
survive reboots; change them in-app under **Settings**. Unlock records are kept
in RAM (last 20) and reset on reboot — there's no RTC, so times are shown
relative to now ("2m ago").

## Endpoints (for reference / integration)

| Method | Path            | Auth      | Purpose |
|--------|-----------------|-----------|---------|
| GET    | `/`             | —         | the web app |
| POST   | `/api/login`    | pairing code | returns a session token |
| POST   | `/api/unlock`   | token     | energise the relay |
| GET    | `/api/records`  | token     | recent unlock attempts |
| GET    | `/api/settings` | token     | current open time |
| POST   | `/api/settings` | token     | set open time |
| POST   | `/api/pin`      | token     | change pairing code |

The session token is passed back in the `X-Token` header. This is a maker-grade
access gate on a local AP; for anything safety-critical, add TLS, rate limiting,
and a hardware fail-secure design.
