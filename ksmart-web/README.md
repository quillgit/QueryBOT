# Ksmart Web

A web-based rebuild of the **Ksmart** Android app (`com.bgwind.ksmart`, v3.1.2) —
a Bluetooth LE smart-lock manager by bgwind. This version was reconstructed from
the app's screens, flows, strings, and theme so the whole experience runs in a
browser with no backend and no native app.

> **Scope.** The original app drives physical locks over Bluetooth LE. Browsers
> cannot speak that firmware's wire protocol directly, so device control here
> runs through a **simulated lock layer** (`js/ble.js`) that honours pairing
> codes and mirrors the original command set (open, query/set time, reboot,
> factory reset, change pairing code, bind/unbind). A **Web Bluetooth**
> integration point is included for wiring up real hardware later.

## Features (reproduced from the original)

- **Login / Register** — numeric account (7–12 digits) + password, with the
  app's validation rules (6–16 chars, not pure numbers).
- **Home** — bound-device list with role badge (Master / User) and online
  status, a drawer menu, and a big unlock button.
- **Add device** — scan-QR and search-nearby flows that bind a lock and set its
  pairing code.
- **Device management** — change alias, open time, reboot, change pairing code,
  factory reset, unbind. Device info card with ID, role, and version.
- **Unlock** — enter the pairing code to open; every attempt is logged.
- **Unlock records** — per-device history with success/failure, with clear-all.
- **Drawer** — shake-to-unlock toggle, shake-threshold (High/Middle/Low),
  About, Reset, Exit.
- **About** — app name, version, slogan ("Smart Lock Leader"), copyright.

Theme colours (brand gold `#bb9f70`, accent `#bb8128`, title-bar blue `#367eb0`)
are taken from the APK's own resources.

## Run it

It's a static site — no build step.

```bash
cd ksmart-web
python3 -m http.server 8777
# open http://localhost:8777
```

Or open `index.html` directly in a browser.

## Data & persistence

All state (users, bound devices, unlock records, settings) lives in the
browser's `localStorage`, scoped per account. Use the drawer's **Reset** to wipe
everything.

## Project layout

```
ksmart-web/
├── index.html        # app shell + phone frame
├── css/style.css     # theme and all screen styles
└── js/
    ├── store.js      # localStorage data layer (users, devices, records)
    ├── ble.js        # lock controller: simulated + Web Bluetooth backends
    └── app.js        # hash router + all screens
```

## Wiring up real locks

`LockController.forDevice(device, { webBluetooth: true })` returns a
`WebBluetoothLock` when the browser supports `navigator.bluetooth`. Its command
framing against physical firmware is intentionally left as an integration point;
the simulated backend is the default so the app is fully usable without hardware.
