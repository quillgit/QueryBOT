/*
 * app.js — Ksmart Web single-page app.
 *
 * Hash-based router that reproduces the screens of the original Ksmart Android
 * app: login / register, home device list + drawer, add device, device
 * settings, unlock records, and about.
 */

(() => {
  const app = document.getElementById('app');

  /* ----------------------------------------------------------- SVG icons */
  const ICON = {
    lock: '<svg viewBox="0 0 24 24"><path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v3H9V6a3 3 0 0 1 3-3zm0 11a2 2 0 0 1 1 3.73V20h-2v-2.27A2 2 0 0 1 12 14z"/></svg>',
    unlock: '<svg viewBox="0 0 24 24"><path d="M12 1a5 5 0 0 0-5 5h2a3 3 0 0 1 6 0v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm0 13a2 2 0 0 1 1 3.73V20h-2v-2.27A2 2 0 0 1 12 14z"/></svg>',
    user: '<svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4 0-9 2-9 5v3h18v-3c0-3-5-5-9-5z"/></svg>',
    key: '<svg viewBox="0 0 24 24"><path d="M12.65 10A6 6 0 1 0 7 14a5.9 5.9 0 0 0 2-.35L11 16h2v2h2v2h3v-3l-5.35-5.35A6 6 0 0 0 12.65 10zM6 8a2 2 0 1 1 2 2 2 2 0 0 1-2-2z"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>',
    add: '<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>',
    qr: '<svg viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm8 0h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm2 2h2v2h-2zm2-2h2v2h-2z"/></svg>',
    time: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 11h-5v-2h3V6h2z"/></svg>',
    reboot: '<svg viewBox="0 0 24 24"><path d="M17.65 6.35A8 8 0 1 0 19.73 14h-2.08A6 6 0 1 1 12 6a5.9 5.9 0 0 1 4.22 1.78L13 11h7V4z"/></svg>',
    reset: '<svg viewBox="0 0 24 24"><path d="M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',
    unbind: '<svg viewBox="0 0 24 24"><path d="M3.9 12a3.1 3.1 0 0 1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h4v-1.9H7A3.1 3.1 0 0 1 3.9 12zM8 13h8v-2H8zm9-6h-4v1.9h4a3.1 3.1 0 0 1 0 6.2h-4V17h4a5 5 0 0 0 0-10z"/></svg>',
    about: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z"/></svg>',
    quit: '<svg viewBox="0 0 24 24"><path d="M10 17v-2H5V9h5V7l5 5zm2-15a10 10 0 0 1 0 20v-2a8 8 0 0 0 0-16z"/></svg>',
    shake: '<svg viewBox="0 0 24 24"><path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 3v12h10V6zm2-5 1.5 2h3L15 1z"/></svg>',
    gauge: '<svg viewBox="0 0 24 24"><path d="M12 4a8 8 0 0 0-8 8 8 8 0 0 0 2 5h12a8 8 0 0 0 2-5 8 8 0 0 0-8-8zm0 3a1 1 0 0 1 1 1 1 1 0 0 1-2 0 1 1 0 0 1 1-1zm-4 4a1 1 0 1 1-1 1 1 1 0 0 1 1-1zm8 0a1 1 0 1 1-1 1 1 1 0 0 1 1-1zm-4 0 2 3h-4z"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75zm17.7-10.2a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"/></svg>',
  };

  /* --------------------------------------------------------- UI helpers */
  function toast(msg) {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 1800);
  }

  function dialog({ title, bodyHTML = '', okText = 'Confirm', cancelText = 'Cancel', danger = false, onOk }) {
    const scrim = el('div', 'modal-scrim');
    scrim.innerHTML = `
      <div class="modal">
        <div class="m-title">${esc(title)}</div>
        <div class="m-body">${bodyHTML}</div>
        <div class="m-actions">
          <button class="cancel">${esc(cancelText)}</button>
          <button class="${danger ? 'danger' : 'primary'} ok">${esc(okText)}</button>
        </div>
      </div>`;
    const close = () => scrim.remove();
    scrim.querySelector('.cancel').onclick = close;
    scrim.querySelector('.ok').onclick = () => {
      const res = onOk ? onOk(scrim) : true;
      if (res !== false) close();
    };
    scrim.addEventListener('click', (e) => { if (e.target === scrim) close(); });
    document.body.appendChild(scrim);
    const input = scrim.querySelector('input');
    if (input) setTimeout(() => input.focus(), 50);
    return scrim;
  }

  function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function fmtDate(ts) {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function titlebar(title, { back = false, right = null, menu = false } = {}) {
    const bar = el('div', 'titlebar');
    const left = el('button', 'tb-btn');
    if (menu) { left.innerHTML = ICON.menu; left.onclick = openDrawer; }
    else if (back) { left.innerHTML = '&#8592;'; left.onclick = () => history.back(); }
    else { left.style.visibility = 'hidden'; }
    const t = el('div', 'tb-title'); t.textContent = title;
    const r = el('div', 'tb-right');
    if (right) r.appendChild(right);
    bar.append(left, t, r);
    return bar;
  }

  function screen(...children) {
    const s = el('div', 'screen');
    children.forEach((c) => c && s.appendChild(c));
    return s;
  }

  function mount(...nodes) {
    app.innerHTML = '';
    nodes.forEach((n) => n && app.appendChild(n));
  }

  /* --------------------------------------------------------------- Guard */
  function requireAuth() {
    if (!Store.currentUser()) { location.hash = '#/login'; return false; }
    return true;
  }

  /* --------------------------------------------------------- Views: auth */
  function viewLogin() {
    const wrap = el('div', 'auth');
    wrap.innerHTML = `
      <div class="logo">${ICON.lock}</div>
      <h1>Ksmart</h1>
      <div class="slogan">Smart Lock Leader</div>
      <form>
        <div class="field">${ICON.user}<input id="acc" inputmode="numeric" placeholder="Account" autocomplete="username"></div>
        <div class="field">${ICON.key}<input id="pwd" type="password" placeholder="Password" autocomplete="current-password"></div>
        <button class="btn block" type="submit">Login now</button>
        <div class="links"><a href="#/register">Register now</a></div>
      </form>`;
    wrap.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      try {
        Store.login(wrap.querySelector('#acc').value, wrap.querySelector('#pwd').value);
        location.hash = '#/home';
      } catch (err) { toast(err.message); }
    };
    mount(wrap);
  }

  function viewRegister() {
    const body = el('div', 'auth');
    body.innerHTML = `
      <div class="logo">${ICON.user}</div>
      <h1>Register</h1>
      <div class="slogan">Create your Ksmart account</div>
      <form>
        <div class="field">${ICON.user}<input id="acc" inputmode="numeric" placeholder="Any 7~12 digits"></div>
        <div class="field">${ICON.key}<input id="p1" type="password" placeholder="Enter password"></div>
        <div class="field">${ICON.key}<input id="p2" type="password" placeholder="Confirm password"></div>
        <button class="btn block" type="submit">Register now</button>
        <div class="links"><a href="#/login">Back to login</a></div>
      </form>
      <div class="hint">6-16 characters, use letters and numbers or symbols; cannot be pure numbers.</div>`;
    body.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      const p1 = body.querySelector('#p1').value;
      const p2 = body.querySelector('#p2').value;
      if (p1 !== p2) return toast('Passwords are different');
      try {
        Store.register(body.querySelector('#acc').value, p1);
        toast('Registered successfully');
        setTimeout(() => (location.hash = '#/login'), 600);
      } catch (err) { toast(err.message); }
    };
    mount(titlebar('Register', { back: true }), screen(body));
  }

  /* --------------------------------------------------------- Views: home */
  function deviceCard(d) {
    const card = el('div', 'device-card');
    const roleBadge = `<span class="badge">${Store.ROLE_LABEL[d.role]}</span>`;
    card.innerHTML = `
      <div class="d-icon">${ICON.lock}</div>
      <div class="d-body">
        <div class="d-name">${esc(d.nickName || d.name)}</div>
        <div class="d-meta">ID: ${esc(d.uniqueId)}</div>
      </div>
      <div class="d-right">
        ${roleBadge}
        <span class="dot ${d.online ? 'online' : 'offline'}">${d.online ? 'Online' : 'Offline'}</span>
      </div>`;
    card.onclick = () => (location.hash = '#/device/' + d.id);
    return card;
  }

  function viewHome() {
    if (!requireAuth()) return;
    const devices = Store.getDevices();
    const addBtn = el('button', 'tb-btn');
    addBtn.innerHTML = ICON.add;
    addBtn.onclick = () => (location.hash = '#/bind');

    const list = el('div');
    if (!devices.length) {
      const empty = el('div', 'empty');
      empty.innerHTML = `${ICON.lock}<div>No devices yet</div><div style="font-size:13px;margin-top:6px">Tap + to bind a smart lock</div>`;
      list.appendChild(empty);
    } else {
      devices.forEach((d) => list.appendChild(deviceCard(d)));
    }

    const note = el('div', 'ble-note');
    note.innerHTML = 'Running in simulated mode — locks respond in software so the full app works in any browser. Pairing codes are enforced.';
    list.appendChild(note);

    const sc = screen(list);

    // Quick-unlock FAB uses the first online device (as the home screen did).
    if (devices.length) {
      const fab = el('div', 'unlock-fab');
      const btn = el('button');
      btn.innerHTML = ICON.unlock;
      btn.onclick = () => quickUnlock(btn);
      fab.appendChild(btn);
      sc.appendChild(fab);
    }

    mount(titlebar('Ksmart', { menu: true, right: addBtn }), sc, drawerEl());
  }

  async function quickUnlock(btn) {
    const d = Store.getDevices().find((x) => x.online) || Store.getDevices()[0];
    if (!d) return;
    await doUnlock(d, btn);
  }

  async function doUnlock(device, btn) {
    const run = async (pin) => {
      if (btn) btn.classList.add('busy');
      const lock = LockController.forDevice(device);
      try {
        await lock.open(pin);
        Store.addRecord({ deviceId: device.id, deviceName: device.nickName || device.name, result: true });
        toast('Unlocked · open for ' + (device.unlockTime || 3) + 's');
      } catch (err) {
        Store.addRecord({ deviceId: device.id, deviceName: device.nickName || device.name, result: false, errorCode: err.code || 1 });
        toast(err.message || 'Unlock failed');
      } finally {
        if (btn) btn.classList.remove('busy');
      }
    };
    // Ask for the pairing code each unlock, like entering the lock PIN.
    dialog({
      title: 'Unlock ' + (device.nickName || device.name),
      bodyHTML: `Input pairing code<input id="pin" type="tel" maxlength="8" placeholder="Pairing code">`,
      okText: 'Open',
      onOk: (scrim) => { run(scrim.querySelector('#pin').value); },
    });
  }

  /* -------------------------------------------------------- Views: bind */
  function viewBind() {
    if (!requireAuth()) return;
    const body = el('div', 'screen-pad');
    body.innerHTML = `
      <div class="section-title">Scan to bind device</div>
      <div class="device-card" id="scan">
        <div class="d-icon">${ICON.qr}</div>
        <div class="d-body"><div class="d-name">Scan QR code</div><div class="d-meta">Bind a lock from its QR label</div></div>
      </div>
      <div class="section-title">Search nearby</div>
      <div id="found"></div>
      <div style="padding:16px"><button class="btn blue block" id="search">Search device</button></div>
      <div class="hint">In the original app this scans for BLE locks. Here we simulate discovery so you can bind and manage a lock end to end.</div>`;

    body.querySelector('#scan').onclick = () => bindFlow({ simulatedScan: true });
    body.querySelector('#search').onclick = () => {
      const btn = body.querySelector('#search');
      btn.disabled = true; btn.textContent = 'Searching...';
      setTimeout(() => {
        const found = body.querySelector('#found');
        found.innerHTML = '';
        const serial = 'BW' + Math.floor(100000 + Math.random() * 899999);
        const card = el('div', 'device-card');
        card.innerHTML = `<div class="d-icon">${ICON.lock}</div><div class="d-body"><div class="d-name">Ksmart Lock</div><div class="d-meta">SN: ${serial}</div></div><div class="d-right"><span class="dot online">Found</span></div>`;
        card.onclick = () => bindFlow({ serial });
        found.appendChild(card);
        btn.disabled = false; btn.textContent = 'Search again';
      }, 900);
    };

    mount(titlebar('Add device', { back: true }), screen(body));
  }

  function bindFlow({ serial, simulatedScan }) {
    const sn = serial || 'BW' + Math.floor(100000 + Math.random() * 899999);
    const existing = Store.getDevices();
    const isNew = true; // treat each discovered lock as new for pairing-code setup
    dialog({
      title: isNew ? 'New device, set pairing code' : 'Enter pairing code',
      bodyHTML: `
        <input id="name" placeholder="Enter device nickname" value="My Lock">
        <input id="pin" type="tel" maxlength="8" placeholder="Set pairing code (6 digits)" style="margin-top:10px">`,
      okText: 'Bind now',
      onOk: (scrim) => {
        const name = scrim.querySelector('#name').value.trim() || 'Smart Lock';
        const pin = scrim.querySelector('#pin').value.trim();
        if (!/^\d{4,8}$/.test(pin)) { toast('Pairing code must be 4-8 digits'); return false; }
        try {
          Store.bindDevice({ name, uniqueId: sn, pin, role: Store.ROLE.MASTER });
          toast('Bound successfully');
          setTimeout(() => (location.hash = '#/home'), 500);
        } catch (err) { toast(err.message); return false; }
      },
    });
  }

  /* ------------------------------------------------------ Views: device */
  function viewDevice(id) {
    if (!requireAuth()) return;
    const d = Store.getDevice(id);
    if (!d) { location.hash = '#/home'; return; }

    const recBtn = el('button', 'tb-btn');
    recBtn.innerHTML = ICON.time;
    recBtn.title = 'Unlock records';
    recBtn.onclick = () => (location.hash = '#/records/' + d.id);

    const body = el('div');
    const hero = el('div', 'dev-hero');
    hero.innerHTML = `
      <div class="d-icon">${ICON.lock}</div>
      <div class="info">
        <div class="n">${esc(d.nickName || d.name)}</div>
        <div class="s">ID: ${esc(d.uniqueId)}</div>
        <div class="s">Role: ${Store.ROLE_LABEL[d.role]} · v${esc(d.deviceVersion)}</div>
      </div>
      <div class="d-right"><span class="dot ${d.online ? 'online' : 'offline'}">${d.online ? 'Online' : 'Offline'}</span></div>`;
    body.appendChild(hero);

    // Big unlock button for this device.
    const fab = el('div', 'unlock-fab');
    const ub = el('button'); ub.innerHTML = ICON.unlock;
    ub.onclick = () => doUnlock(d, ub);
    fab.appendChild(ub);
    body.appendChild(fab);

    const list = el('div', 'list');
    const rows = [
      { ic: ICON.edit, lbl: 'Change device alias', fn: () => renameDevice(d) },
      { ic: ICON.time, lbl: 'Open time', val: (d.unlockTime || 3) + 's', fn: () => setOpenTime(d) },
      { ic: ICON.reboot, lbl: 'Reboot device', fn: () => rebootDevice(d) },
      { gap: true },
      { ic: ICON.key, lbl: 'Change pairing code', fn: () => changePin(d) },
      { ic: ICON.reset, lbl: 'Restore factory settings', fn: () => factoryReset(d) },
      { gap: true },
      { ic: ICON.unbind, lbl: 'Unbind', danger: true, fn: () => unbindDevice(d) },
    ];
    rows.forEach((r) => {
      if (r.gap) { list.appendChild(el('div', 'list-group-gap')); return; }
      const row = el('div', 'list-row' + (r.danger ? ' danger' : ''));
      row.innerHTML = `<span class="ic">${r.ic}</span><span class="lbl">${r.lbl}</span>${r.val ? `<span class="val">${r.val}</span>` : ''}`;
      row.onclick = r.fn;
      list.appendChild(row);
    });
    body.appendChild(list);

    mount(titlebar('Device management', { back: true, right: recBtn }), screen(body));
  }

  function renameDevice(d) {
    dialog({
      title: 'Change device alias',
      bodyHTML: `<input id="v" value="${esc(d.nickName || d.name)}" placeholder="Enter device nickname">`,
      onOk: (s) => {
        const v = s.querySelector('#v').value.trim();
        if (!v) { toast('Enter name'); return false; }
        d.nickName = v; Store.saveDevice(d); toast('Saved'); viewDevice(d.id);
      },
    });
  }

  function setOpenTime(d) {
    const opts = [1, 3, 5, 8, 10];
    const radios = opts.map((n) => `<label class="radio-row"><input type="radio" name="t" value="${n}" ${n === (d.unlockTime || 3) ? 'checked' : ''}> ${n} seconds</label>`).join('');
    dialog({
      title: 'Open time',
      bodyHTML: radios,
      onOk: (s) => {
        const sel = s.querySelector('input[name="t"]:checked');
        d.unlockTime = Number(sel.value); Store.saveDevice(d); toast('Set time succeed'); viewDevice(d.id);
      },
    });
  }

  function rebootDevice(d) {
    dialog({
      title: 'Device reboot',
      bodyHTML: 'Are you sure you want to reboot the device?',
      okText: 'Reboot',
      onOk: async () => {
        toast('Rebooting...');
        try { await LockController.forDevice(d).reboot(); toast('Reboot succeed'); }
        catch (e) { toast(e.message || 'Failed'); }
      },
    });
  }

  function changePin(d) {
    dialog({
      title: 'Change pairing code',
      bodyHTML: `
        <input id="old" type="tel" maxlength="8" placeholder="Enter old password">
        <input id="n1" type="tel" maxlength="8" placeholder="Enter new password" style="margin-top:10px">
        <input id="n2" type="tel" maxlength="8" placeholder="Confirm new password" style="margin-top:10px">
        <div class="hint" style="padding:10px 0 0;text-align:left">After the code changes, other users must re-enter the new pairing code.</div>`,
      onOk: async (s) => {
        const o = s.querySelector('#old').value, n1 = s.querySelector('#n1').value, n2 = s.querySelector('#n2').value;
        if (n1 !== n2) { toast('Passwords are different'); return false; }
        if (!/^\d{4,8}$/.test(n1)) { toast('Wrong password digits'); return false; }
        try {
          const res = await LockController.forDevice(d).changePin(o, n1);
          d.pin = res.newPin; Store.saveDevice(d); toast('Pairing code changed');
        } catch (e) { toast(e.message || 'Failed'); return false; }
      },
    });
  }

  function factoryReset(d) {
    dialog({
      title: 'Restore default',
      bodyHTML: `Are you sure you want to initialize the device?<input id="pin" type="tel" maxlength="8" placeholder="Pairing code" style="margin-top:10px">`,
      okText: 'Reset', danger: true,
      onOk: async (s) => {
        try {
          await LockController.forDevice(d).factoryReset(s.querySelector('#pin').value);
          Store.unbindDevice(d.id);
          toast('Device reset, unbound');
          setTimeout(() => (location.hash = '#/home'), 500);
        } catch (e) { toast(e.message || 'Failed'); return false; }
      },
    });
  }

  function unbindDevice(d) {
    dialog({
      title: 'Unbind', bodyHTML: 'Unbind this device?', okText: 'Unbind', danger: true,
      onOk: () => { Store.unbindDevice(d.id); toast('Unbound'); setTimeout(() => (location.hash = '#/home'), 400); },
    });
  }

  /* ----------------------------------------------------- Views: records */
  function viewRecords(id) {
    if (!requireAuth()) return;
    const d = Store.getDevice(id);
    if (!d) { location.hash = '#/home'; return; }
    const recs = Store.getRecords(id);

    const clearBtn = el('button', 'tb-btn');
    clearBtn.innerHTML = ICON.reset; clearBtn.title = 'Clear records';
    clearBtn.onclick = () => dialog({
      title: 'Delete', bodyHTML: 'Delete all records, continue?', okText: 'Delete', danger: true,
      onOk: () => { Store.clearRecords(id); toast('Deleted'); viewRecords(id); },
    });

    const body = el('div');
    if (!recs.length) {
      const e = el('div', 'empty');
      e.innerHTML = `${ICON.time}<div>No unlock records</div>`;
      body.appendChild(e);
    } else {
      recs.forEach((r) => {
        const row = el('div', 'record-row');
        row.innerHTML = `
          <div class="r-left">
            <div class="r-name">${esc(r.deviceName)} · ${esc(r.userName)}</div>
            <div class="r-time">${fmtDate(r.at)}</div>
          </div>
          <div class="r-res ${r.result ? 'ok' : 'fail'}">${r.result ? 'Success' : 'Failed'}</div>`;
        body.appendChild(row);
      });
    }
    mount(titlebar('Unlock records', { back: true, right: recs.length ? clearBtn : null }), screen(body));
  }

  /* ------------------------------------------------------- Views: about */
  function viewAbout() {
    const body = el('div', 'about');
    body.innerHTML = `
      <div class="logo">${ICON.lock}</div>
      <div class="app-name">Ksmart</div>
      <div class="ver">Version 3.1.2 (Web)</div>
      <div class="slogan">Smart Lock Leader</div>
      <div class="hint">Web rebuild of the Ksmart BLE smart-lock app. Device control runs in a simulated lock layer; a Web Bluetooth integration point is included for real hardware.</div>
      <div class="copy">copyright by bgwind</div>`;
    mount(titlebar('About', { back: true }), screen(body));
  }

  /* --------------------------------------------------------- Drawer menu */
  let drawerNodes = null;
  function drawerEl() {
    const user = Store.currentUser();
    const settings = Store.getSettings();
    const scrim = el('div', 'drawer-scrim');
    const drawer = el('div', 'drawer');
    const thLabel = { [Store.SHAKE.HIGH]: 'High', [Store.SHAKE.MIDDLE]: 'Middle', [Store.SHAKE.LOW]: 'Low' };
    drawer.innerHTML = `
      <div class="d-head">
        <div class="avatar">${ICON.user}</div>
        <div class="name">${esc(user ? user.account : 'Ksmart')}</div>
      </div>
      <div class="entrance">
        <span class="ic">${ICON.shake}</span><span class="lbl">Shake open</span>
        <label class="switch"><input type="checkbox" id="sk" ${settings.shakeUnlock ? 'checked' : ''}><span class="track"></span></label>
      </div>
      <div class="entrance" id="th"><span class="ic">${ICON.gauge}</span><span class="lbl">Shake threshold</span><span class="more">${thLabel[settings.shakeThreshold] || 'Middle'} &#8250;</span></div>
      <div class="entrance" id="about"><span class="ic">${ICON.about}</span><span class="lbl">About Ksmart</span><span class="more">&#8250;</span></div>
      <div class="entrance" id="reset"><span class="ic">${ICON.reset}</span><span class="lbl">Reset</span><span class="more">&#8250;</span></div>
      <div class="entrance" id="quit"><span class="ic">${ICON.quit}</span><span class="lbl">Exit</span><span class="more">&#8250;</span></div>`;

    scrim.onclick = closeDrawer;
    drawer.querySelector('#sk').onchange = (e) => { Store.saveSettings({ shakeUnlock: e.target.checked }); toast(e.target.checked ? 'Shake open on' : 'Shake open off'); };
    drawer.querySelector('#th').onclick = () => {
      const s = Store.getSettings();
      dialog({
        title: 'Shake threshold setting',
        bodyHTML: [['High', Store.SHAKE.HIGH], ['Middle', Store.SHAKE.MIDDLE], ['Low', Store.SHAKE.LOW]]
          .map(([l, v]) => `<label class="radio-row"><input type="radio" name="th" value="${v}" ${v === s.shakeThreshold ? 'checked' : ''}> ${l}</label>`).join(''),
        onOk: (sc) => { Store.saveSettings({ shakeThreshold: Number(sc.querySelector('input[name="th"]:checked').value) }); toast('Saved'); closeDrawer(); viewHome(); },
      });
    };
    drawer.querySelector('#about').onclick = () => { closeDrawer(); location.hash = '#/about'; };
    drawer.querySelector('#reset').onclick = () => dialog({
      title: 'Reset', bodyHTML: 'Reset will erase all data, continue?', okText: 'Reset', danger: true,
      onOk: () => { Store.resetAll(); location.hash = '#/login'; },
    });
    drawer.querySelector('#quit').onclick = () => dialog({
      title: 'Exit', bodyHTML: 'Continue to exit?', okText: 'Exit',
      onOk: () => { Store.logout(); location.hash = '#/login'; },
    });

    drawerNodes = { scrim, drawer };
    const frag = document.createDocumentFragment();
    frag.append(scrim, drawer);
    const holder = el('div');
    holder.append(scrim, drawer);
    return holder;
  }
  function openDrawer() { if (drawerNodes) { drawerNodes.scrim.classList.add('open'); drawerNodes.drawer.classList.add('open'); } }
  function closeDrawer() { if (drawerNodes) { drawerNodes.scrim.classList.remove('open'); drawerNodes.drawer.classList.remove('open'); } }

  /* -------------------------------------------------------------- Router */
  function route() {
    const hash = location.hash || '#/';
    const [, path, arg] = hash.match(/^#\/?([^/]*)\/?(.*)$/) || [];
    switch (path) {
      case '':
      case 'home': return Store.currentUser() ? viewHome() : (location.hash = '#/login');
      case 'login': return viewLogin();
      case 'register': return viewRegister();
      case 'bind': return viewBind();
      case 'device': return viewDevice(arg);
      case 'records': return viewRecords(arg);
      case 'about': return viewAbout();
      default: return viewHome();
    }
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('DOMContentLoaded', route);
  if (document.readyState !== 'loading') route();
})();
