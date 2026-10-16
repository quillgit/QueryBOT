/*
 * store.js — client-side persistence layer for Ksmart Web.
 *
 * The original Ksmart Android app kept all state locally on the phone and
 * talked to physical locks over Bluetooth LE. This web rebuild keeps the same
 * model (users, bound devices, unlock records, app settings) in localStorage so
 * the whole experience runs with no backend. Swap these functions for real HTTP
 * calls if you later stand up the `http://cmt.bgwind.com/smartiot` style backend.
 */

const Store = (() => {
  const KEYS = {
    users: 'ksmart.users',
    session: 'ksmart.session',
    devices: 'ksmart.devices',
    records: 'ksmart.records',
    settings: 'ksmart.settings',
  };

  // User roles mirror the original app: master (admin) and normal user.
  const ROLE = { MASTER: 1, USER: 2, UNKNOWN: 0 };
  const ROLE_LABEL = { 1: 'Master', 2: 'User', 0: 'Unknown' };

  // Shake-to-unlock thresholds from AppConstants.
  const SHAKE = { HIGH: 6, MIDDLE: 11, LOW: 15 };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('Store read failed', key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Store write failed', key, e);
    }
  }

  function uid() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  /* ---------------------------------------------------------------- Users */

  function getUsers() {
    return read(KEYS.users, []);
  }

  function register(account, password) {
    account = String(account || '').trim();
    const users = getUsers();
    if (!/^\d{7,12}$/.test(account)) {
      throw new Error('Account must be 7~12 digits');
    }
    if (!password || password.length < 6 || password.length > 16) {
      throw new Error('Password must be 6-16 characters');
    }
    if (/^\d+$/.test(password)) {
      throw new Error('Password cannot be pure numbers');
    }
    if (users.some((u) => u.account === account)) {
      throw new Error('Account already registered');
    }
    const user = { id: uid(), account, password, createdAt: Date.now() };
    users.push(user);
    write(KEYS.users, users);
    return user;
  }

  function login(account, password) {
    account = String(account || '').trim();
    const user = getUsers().find((u) => u.account === account);
    if (!user || user.password !== password) {
      throw new Error('Account or password is wrong');
    }
    const session = { userId: user.id, account: user.account, at: Date.now() };
    write(KEYS.session, session);
    return session;
  }

  function logout() {
    localStorage.removeItem(KEYS.session);
  }

  function currentUser() {
    const s = read(KEYS.session, null);
    if (!s) return null;
    return getUsers().find((u) => u.id === s.userId) || null;
  }

  /* -------------------------------------------------------------- Devices */

  // Devices are scoped per user id so different accounts see their own locks.
  function getDevices() {
    const u = currentUser();
    if (!u) return [];
    return read(KEYS.devices, []).filter((d) => d.ownerId === u.id);
  }

  function getDevice(id) {
    return read(KEYS.devices, []).find((d) => d.id === id) || null;
  }

  function saveDevice(device) {
    const all = read(KEYS.devices, []);
    const idx = all.findIndex((d) => d.id === device.id);
    if (idx >= 0) all[idx] = device;
    else all.push(device);
    write(KEYS.devices, all);
    return device;
  }

  function bindDevice({ name, uniqueId, pin, role = ROLE.MASTER }) {
    const u = currentUser();
    if (!u) throw new Error('Not logged in');
    const all = read(KEYS.devices, []);
    if (all.some((d) => d.ownerId === u.id && d.uniqueId === uniqueId)) {
      throw new Error('Device already bound');
    }
    const device = {
      id: uid(),
      ownerId: u.id,
      name: name || 'Smart Lock',
      nickName: name || 'Smart Lock',
      uniqueId,
      pin: String(pin),
      role,
      userCount: 1,
      unlockTime: 3, // open duration in seconds
      deviceVersion: '3.1.2',
      online: true,
      boundAt: Date.now(),
    };
    all.push(device);
    write(KEYS.devices, all);
    return device;
  }

  function unbindDevice(id) {
    let all = read(KEYS.devices, []);
    all = all.filter((d) => d.id !== id);
    write(KEYS.devices, all);
    // Drop that device's unlock records too.
    write(
      KEYS.records,
      read(KEYS.records, []).filter((r) => r.deviceId !== id)
    );
  }

  /* -------------------------------------------------------- Unlock records */

  function getRecords(deviceId) {
    let recs = read(KEYS.records, []);
    if (deviceId) recs = recs.filter((r) => r.deviceId === deviceId);
    else {
      const ids = new Set(getDevices().map((d) => d.id));
      recs = recs.filter((r) => ids.has(r.deviceId));
    }
    return recs.sort((a, b) => b.at - a.at);
  }

  function addRecord({ deviceId, deviceName, result, errorCode = 0 }) {
    const u = currentUser();
    const all = read(KEYS.records, []);
    all.push({
      id: uid(),
      deviceId,
      deviceName,
      userName: u ? u.account : '',
      result, // true = success, false = failed
      errorCode,
      at: Date.now(),
    });
    write(KEYS.records, all);
  }

  function clearRecords(deviceId) {
    write(
      KEYS.records,
      read(KEYS.records, []).filter((r) => r.deviceId !== deviceId)
    );
  }

  /* ------------------------------------------------------------- Settings */

  function getSettings() {
    return read(KEYS.settings, {
      shakeUnlock: false,
      shakeThreshold: SHAKE.MIDDLE,
    });
  }

  function saveSettings(patch) {
    const next = Object.assign(getSettings(), patch);
    write(KEYS.settings, next);
    return next;
  }

  function resetAll() {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  }

  return {
    ROLE,
    ROLE_LABEL,
    SHAKE,
    uid,
    getUsers,
    register,
    login,
    logout,
    currentUser,
    getDevices,
    getDevice,
    saveDevice,
    bindDevice,
    unbindDevice,
    getRecords,
    addRecord,
    clearRecords,
    getSettings,
    saveSettings,
    resetAll,
  };
})();
