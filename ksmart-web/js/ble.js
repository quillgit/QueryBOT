/*
 * ble.js — lock controller for Ksmart Web.
 *
 * The original app drove a BLE lock through a command set (open, query time,
 * set time, reboot, factory reset, bind/unbind, change pairing code). This
 * module mirrors that command vocabulary with a clean async API.
 *
 * Two backends are provided:
 *   - SimulatedLock: default. Models a lock in software so the whole app works
 *     in any browser with no hardware. Honours the pairing code (PIN).
 *   - WebBluetoothLock: an optional thin wrapper around navigator.bluetooth for
 *     browsers that support Web Bluetooth, left as an integration point.
 *
 * Command names echo BLELockController in the APK (APP_CMD_OPEN, etc.) so the
 * mapping to real firmware stays obvious, without reproducing the wire-level
 * crypto of a specific physical lock.
 */

const LockController = (() => {
  const CMD = {
    OPEN: 'open',
    CLOSE: 'close',
    INQUIRY_TIME: 'inquiry_time',
    SET_TIME: 'set_time',
    INQUIRY_VERSION: 'inquiry_version',
    REBOOT: 'reboot',
    FACTORY_RESET: 'factory_reset',
    CHANGE_PIN: 'change_pin',
    BIND: 'bind',
    UNBIND: 'unbind',
  };

  // Error codes surfaced in unlock records, loosely following the app.
  const ERR = {
    OK: 0,
    WRONG_PIN: 1,
    OFFLINE: 2,
    TIMEOUT: 3,
  };

  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  /* ----------------------------------------------------- Simulated backend */

  class SimulatedLock {
    constructor(device) {
      this.device = device;
    }

    async connect() {
      await delay(400);
      if (!this.device.online) {
        throw { code: ERR.OFFLINE, message: 'Device is offline' };
      }
      return true;
    }

    async open(pin) {
      await this.connect();
      await delay(500);
      if (String(pin) !== String(this.device.pin)) {
        throw { code: ERR.WRONG_PIN, message: 'Pairing code is wrong' };
      }
      // Lock stays "open" for unlockTime seconds — represented by the result.
      return { code: ERR.OK, openFor: this.device.unlockTime || 3 };
    }

    async inquiryTime() {
      await this.connect();
      await delay(200);
      return { time: new Date() };
    }

    async setTime() {
      await this.connect();
      await delay(300);
      return { code: ERR.OK, time: new Date() };
    }

    async inquiryVersion() {
      await this.connect();
      return { version: this.device.deviceVersion || '3.1.2' };
    }

    async reboot() {
      await this.connect();
      await delay(1200);
      return { code: ERR.OK };
    }

    async factoryReset(pin) {
      await this.connect();
      await delay(900);
      if (String(pin) !== String(this.device.pin)) {
        throw { code: ERR.WRONG_PIN, message: 'Pairing code is wrong' };
      }
      return { code: ERR.OK };
    }

    async changePin(oldPin, newPin) {
      await this.connect();
      await delay(600);
      if (String(oldPin) !== String(this.device.pin)) {
        throw { code: ERR.WRONG_PIN, message: 'Old pairing code is wrong' };
      }
      return { code: ERR.OK, newPin: String(newPin) };
    }
  }

  /* -------------------------------------------- Web Bluetooth (optional) */

  const WEB_BLE_SERVICE = 0xffe0; // common UART-style service on these locks

  class WebBluetoothLock {
    constructor(device) {
      this.device = device;
      this.gatt = null;
    }

    static get supported() {
      return typeof navigator !== 'undefined' && !!navigator.bluetooth;
    }

    async connect() {
      if (!WebBluetoothLock.supported) {
        throw { code: ERR.OFFLINE, message: 'Web Bluetooth not supported in this browser' };
      }
      const btDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: [WEB_BLE_SERVICE] }],
        optionalServices: [WEB_BLE_SERVICE],
      });
      this.gatt = await btDevice.gatt.connect();
      return true;
    }

    // Real command framing against physical firmware would go here. Left as an
    // explicit integration point so the simulated path remains the default.
    async open() {
      throw { code: ERR.TIMEOUT, message: 'Real lock command framing not configured' };
    }
  }

  // Simulated backend is the default; callers may pass { webBluetooth: true }.
  function forDevice(device, opts = {}) {
    if (opts.webBluetooth && WebBluetoothLock.supported) {
      return new WebBluetoothLock(device);
    }
    return new SimulatedLock(device);
  }

  return { CMD, ERR, forDevice, webBluetoothSupported: WebBluetoothLock.supported };
})();
