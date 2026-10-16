/*
 * Ksmart_ESP32_BLE_Bridge.ino
 *
 * ESP32 as a BLE *central* that connects to an existing Ksmart smart lock
 * (the same lock the phone app talks to) and bridges it to a small WiFi web UI.
 * This is for working with YOUR OWN lock: it connects over the lock's BLE
 * service and gives you a live console to observe the lock's replies and send
 * command frames, so the exact "open" sequence can be derived and verified
 * against your own device.
 *
 *   [Browser] --WiFi AP--> [ESP32 BLE central] --BLE (NUS)--> [Ksmart lock]
 *
 * Why a console instead of a ready-made "open" button?
 * ----------------------------------------------------
 * The lock does not accept a raw "open". From the app, the flow is:
 *     share-hand (0x00) -> encrypted auth with the pairing code (0x10)
 *                       -> open (0x31), each frame carrying a flow number.
 * The authentication is device-specific and encrypted, so this sketch gives
 * you the plumbing (scan/connect/notify/write) plus a hex console to work out
 * and test that handshake on your own lock. Fill in buildOpenSequence() once
 * you've confirmed the frames with the console + serial log.
 *
 * ---- Known facts (from the Ksmart APK) ----
 *   BLE service  (NUS)  : 6e400001-b5a3-f393-e0a9-e50e24dcca9e
 *   write  (app -> lock): 6e400002-b5a3-f393-e0a9-e50e24dcca9e
 *   notify (lock -> app): 6e400003-b5a3-f393-e0a9-e50e24dcca9e
 *   command ids: SHAREHAND=0x00 AUTH_START=0x10 OPEN=0x31
 *                INQUIRY_TIME=0x35 SET_TIME=0x34 CLOSE=0x32
 *   lock replies put the command id at byte index [3] and a status/ret code.
 *
 * ---- Requirements ----
 *   Board: ESP32 (Arduino-ESP32 core)
 *   Library: "NimBLE-Arduino" by h2zero (install via Library Manager).
 *            Tested against the NimBLE-Arduino 1.4.x API.
 *
 * ---- Use ----
 *   1. Flash. ESP32 starts WiFi AP "Ksmart-Bridge" (pass "ksmart123").
 *   2. Join it, open http://192.168.4.1
 *   3. "Scan & connect" — picks the lock by name filter (TARGET_NAME) or NUS.
 *   4. Watch the live log; type hex frames to send to the lock and observe
 *      replies. Use this to confirm the share-hand / auth / open frames.
 */

#include <WiFi.h>
#include <WebServer.h>
#include <NimBLEDevice.h>

/* ============================ CONFIG ============================ */
static const char* AP_SSID = "Ksmart-Bridge";
static const char* AP_PASS = "ksmart123";          // >= 8 chars

// Only connect to a device whose advertised name contains this text.
// Leave "" to match any device that advertises the NUS service.
static const char* TARGET_NAME = "";

// Nordic UART Service (the Ksmart lock uses this).
static const char* NUS_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
static const char* NUS_WRITE   = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // app -> lock
static const char* NUS_NOTIFY  = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // lock -> app

// Command ids (from the APK) — for reference and for buildOpenSequence().
enum : uint8_t {
  CMD_SHAREHAND    = 0x00,
  CMD_AUTH_START   = 0x10,
  CMD_PIN_START    = 0x20,
  CMD_OPEN         = 0x31,
  CMD_CLOSE        = 0x32,
  CMD_SET_TIME     = 0x34,
  CMD_INQUIRY_TIME = 0x35,
};
/* =============================================================== */

WebServer server(80);

NimBLEClient*             g_client  = nullptr;
NimBLERemoteCharacteristic* g_write = nullptr;
NimBLERemoteCharacteristic* g_notify = nullptr;
NimBLEAdvertisedDevice*    g_target = nullptr;

volatile bool g_connected = false;
volatile bool g_scanning  = false;
String g_devName = "";

// Rolling log of lines (both TX we send and RX we receive), newest last.
static const int LOG_MAX = 40;
String g_log[LOG_MAX];
int    g_logCount = 0;
int    g_logHead  = 0;

void logLine(const String& s) {
  g_log[g_logHead] = s;
  g_logHead = (g_logHead + 1) % LOG_MAX;
  if (g_logCount < LOG_MAX) g_logCount++;
  Serial.println(s);
}

String toHex(const uint8_t* d, size_t n) {
  String s;
  for (size_t i = 0; i < n; i++) {
    char b[4];
    sprintf(b, "%02X ", d[i]);
    s += b;
  }
  s.trim();
  return s;
}

int fromHex(const String& hex, uint8_t* out, int maxLen) {
  int n = 0;
  int i = 0;
  while (i < (int)hex.length() && n < maxLen) {
    // skip separators
    while (i < (int)hex.length() && !isxdigit(hex[i])) i++;
    if (i + 1 >= (int)hex.length()) break;
    auto nib = [](char c) -> int {
      if (c >= '0' && c <= '9') return c - '0';
      if (c >= 'a' && c <= 'f') return c - 'a' + 10;
      if (c >= 'A' && c <= 'F') return c - 'A' + 10;
      return 0;
    };
    out[n++] = (nib(hex[i]) << 4) | nib(hex[i + 1]);
    i += 2;
  }
  return n;
}

/* --------------------------------------------- BLE notify callback */
void onNotify(NimBLERemoteCharacteristic* chr, uint8_t* data, size_t len, bool isNotify) {
  logLine("RX  " + toHex(data, len));
}

/* --------------------------------------------- client callbacks */
class ClientCB : public NimBLEClientCallbacks {
  void onConnect(NimBLEClient* c) override { logLine("-- connected"); }
  void onDisconnect(NimBLEClient* c, int reason) override {
    g_connected = false;
    logLine("-- disconnected (" + String(reason) + ")");
  }
};
ClientCB g_clientCB;

/* --------------------------------------------- scan callback */
class ScanCB : public NimBLEScanCallbacks {
  void onResult(const NimBLEAdvertisedDevice* dev) override {
    bool match = false;
    if (strlen(TARGET_NAME) > 0) {
      match = dev->haveName() && String(dev->getName().c_str()).indexOf(TARGET_NAME) >= 0;
    } else {
      match = dev->isAdvertisingService(NimBLEUUID(NUS_SERVICE));
    }
    if (match) {
      logLine("Found: " + String(dev->getName().c_str()) + " [" + String(dev->getAddress().toString().c_str()) + "]");
      g_devName = dev->getName().c_str();
      if (g_target) { delete g_target; }
      g_target = new NimBLEAdvertisedDevice(*dev);
      NimBLEDevice::getScan()->stop();
    }
  }
  void onScanEnd(const NimBLEScanResults& results, int reason) override {
    g_scanning = false;
  }
};
ScanCB g_scanCB;

/* --------------------------------------------- connect flow */
bool connectToLock() {
  if (!g_target) { logLine("!! no target found"); return false; }
  logLine("Connecting to " + String(g_target->getAddress().toString().c_str()) + " ...");

  if (g_client) { NimBLEDevice::deleteClient(g_client); g_client = nullptr; }
  g_client = NimBLEDevice::createClient();
  g_client->setClientCallbacks(&g_clientCB, false);

  if (!g_client->connect(g_target)) { logLine("!! connect failed"); return false; }

  NimBLERemoteService* svc = g_client->getService(NUS_SERVICE);
  if (!svc) { logLine("!! NUS service not found"); g_client->disconnect(); return false; }

  g_write  = svc->getCharacteristic(NUS_WRITE);
  g_notify = svc->getCharacteristic(NUS_NOTIFY);
  if (!g_write || !g_notify) { logLine("!! characteristics not found"); g_client->disconnect(); return false; }

  if (g_notify->canNotify()) {
    g_notify->subscribe(true, onNotify);
    logLine("-- subscribed to notify");
  }
  g_connected = true;
  logLine("-- ready");
  return true;
}

bool sendBytes(const uint8_t* d, size_t n) {
  if (!g_connected || !g_write) return false;
  bool ok = g_write->writeValue(d, n, false); // write-without-response
  logLine("TX  " + toHex(d, n) + (ok ? "" : "  (write failed)"));
  return ok;
}

/* --------------------------------------------------------------------------
 * buildOpenSequence(): the device-specific part to complete on YOUR lock.
 *
 * From the APK the order is share-hand -> encrypted auth(pairing code)
 * -> open(0x31). The auth frame is encrypted and device-specific, so derive
 * the exact bytes with the web console + serial log against your own lock,
 * then assemble them here. Left intentionally empty so this sketch ships as a
 * connect/observe tool rather than a prebuilt unlocker.
 * ------------------------------------------------------------------------ */
bool buildOpenSequence(const String& pin, const String& sn) {
  // TODO (your device): send share-hand, perform the encrypted auth with `pin`
  // and `sn`, then send the open frame. Use /api/send from the console to
  // confirm each frame first.
  logLine("!! open sequence not configured — use the console to derive it");
  return false;
}

/* ---------------------------------------------------- web UI (PROGMEM) */
const char PAGE[] PROGMEM = R"HTML(<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Ksmart BLE Bridge</title>
<style>
:root{--gold:#bb9f70;--gold-deep:#ae8746;--blue:#367eb0;--bg:#ededed;--muted:#8e8e8e;--green:#4caf50}
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:#d8d8d8;color:#282828}
#app{max-width:480px;margin:0 auto;min-height:100vh;background:var(--bg);display:flex;flex-direction:column}
.bar{background:var(--blue);color:#fff;height:52px;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:600}
.scr{padding:16px;display:flex;flex-direction:column;gap:12px}
.card{background:#fff;border-radius:12px;padding:14px}
.st{display:flex;align-items:center;gap:8px;font-size:14px}
.dot{width:10px;height:10px;border-radius:50%;background:#c9c9c9}.dot.on{background:var(--green)}
.btn{border:none;border-radius:22px;height:42px;padding:0 18px;font-size:15px;font-weight:600;color:#fff;cursor:pointer;background:linear-gradient(135deg,var(--gold),var(--gold-deep))}
.btn.blue{background:linear-gradient(135deg,var(--blue),#2d6a95)}.btn:active{transform:translateY(1px)}
.row{display:flex;gap:8px}.row input{flex:1;height:42px;border:1px solid #ddd;border-radius:8px;padding:0 12px;font-size:14px;font-family:monospace;outline:none}
.log{background:#0d1117;color:#8ff0a4;font-family:monospace;font-size:12px;border-radius:10px;padding:12px;height:300px;overflow:auto;white-space:pre-wrap;line-height:1.5}
.log .tx{color:#79c0ff}.log .rx{color:#8ff0a4}.log .ev{color:#d29922}
.hint{font-size:12px;color:var(--muted);line-height:1.5}
label{font-size:12px;color:var(--muted);display:block;margin-bottom:4px}
</style></head>
<body><div id="app">
  <div class="bar">Ksmart BLE Bridge</div>
  <div class="scr">
    <div class="card st"><span class="dot" id="dot"></span><span id="stxt">Disconnected</span>
      <span style="flex:1"></span><button class="btn" id="scan">Scan &amp; connect</button></div>

    <div class="card">
      <label>Send raw frame to lock (hex, e.g. <code>AA 00 31 ...</code>)</label>
      <div class="row"><input id="hex" placeholder="hex bytes"><button class="btn blue" id="send">Send</button></div>
      <div class="hint" style="margin-top:8px">Known command ids: SHAREHAND 00 · AUTH 10 · OPEN 31 · TIME 35. Replies appear in the log; byte [3] is the echoed command id.</div>
    </div>

    <div class="card">
      <label>Live BLE log</label>
      <div class="log" id="log">(no data yet)</div>
      <div class="hint" style="margin-top:8px"><span style="color:#79c0ff">TX</span> = sent to lock · <span style="color:#8ff0a4">RX</span> = reply from lock. Use these to work out the open sequence for your lock.</div>
    </div>
  </div>
</div>
<script>
function api(p,b){return fetch(p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined}).then(function(r){return r.json()})}
function color(line){var c=line.indexOf('TX')===0?'tx':line.indexOf('RX')===0?'rx':'ev';return '<span class="'+c+'">'+line.replace(/[&<>]/g,function(x){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[x]})+'</span>'}
function refresh(){api('/api/status').then(function(s){
  document.getElementById('dot').className='dot'+(s.connected?' on':'');
  document.getElementById('stxt').textContent=s.connected?('Connected · '+(s.name||'lock')):(s.scanning?'Scanning...':'Disconnected');
  var L=document.getElementById('log');var at=L.scrollTop+L.clientHeight>=L.scrollHeight-20;
  L.innerHTML=s.log.length?s.log.map(color).join('\n'):'(no data yet)';
  if(at)L.scrollTop=L.scrollHeight;
})}
document.getElementById('scan').onclick=function(){api('/api/scan',{}).then(refresh)};
document.getElementById('send').onclick=function(){
  var h=document.getElementById('hex').value;if(!h.trim())return;
  api('/api/send',{hex:h}).then(function(){document.getElementById('hex').value='';refresh()})
};
setInterval(refresh,800);refresh();
</script></body></html>)HTML";

/* ---------------------------------------------------- web handlers */
void handleRoot() {
  server.sendHeader("Cache-Control", "no-store");
  server.send_P(200, "text/html", PAGE);
}

void handleStatus() {
  String out = "{\"connected\":" + String(g_connected ? "true" : "false") +
               ",\"scanning\":" + String(g_scanning ? "true" : "false") +
               ",\"name\":\"" + g_devName + "\",\"log\":[";
  for (int n = 0; n < g_logCount; n++) {
    int idx = (g_logHead - g_logCount + n + LOG_MAX) % LOG_MAX; // oldest first
    String s = g_log[idx];
    s.replace("\\", "\\\\");
    s.replace("\"", "\\\"");
    if (n) out += ",";
    out += "\"" + s + "\"";
  }
  out += "]}";
  server.send(200, "application/json", out);
}

void handleScan() {
  if (g_scanning) { server.send(200, "application/json", "{\"ok\":true}"); return; }
  g_scanning = true;
  if (g_target) { delete g_target; g_target = nullptr; }
  logLine("Scanning...");
  NimBLEScan* scan = NimBLEDevice::getScan();
  scan->setScanCallbacks(&g_scanCB, false);
  scan->setActiveScan(true);
  scan->start(6 * 1000, false, true);   // 6s, non-blocking
  server.send(200, "application/json", "{\"ok\":true}");
}

void handleSend() {
  uint8_t buf[64];
  String body = server.arg("plain");
  int k = body.indexOf("\"hex\"");
  String hex = "";
  if (k >= 0) {
    int c = body.indexOf(':', k);
    int q1 = body.indexOf('"', c + 1);
    int q2 = body.indexOf('"', q1 + 1);
    if (q1 >= 0 && q2 > q1) hex = body.substring(q1 + 1, q2);
  }
  int n = fromHex(hex, buf, sizeof(buf));
  if (n <= 0) { server.send(400, "application/json", "{\"error\":\"no bytes\"}"); return; }
  bool ok = sendBytes(buf, n);
  server.send(ok ? 200 : 400, "application/json", String("{\"ok\":") + (ok ? "true" : "false") + "}");
}

/* --------------------------------------------------------- setup/loop */
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\nKsmart BLE Bridge starting...");

  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.print("AP IP: "); Serial.println(WiFi.softAPIP());

  NimBLEDevice::init("ksmart-bridge");
  NimBLEDevice::setPower(ESP_PWR_LVL_P9);

  server.on("/", HTTP_GET, handleRoot);
  server.on("/api/status", HTTP_GET, handleStatus);
  server.on("/api/scan", HTTP_POST, handleScan);
  server.on("/api/send", HTTP_POST, handleSend);
  server.onNotFound([]() { server.sendHeader("Location", "/"); server.send(302, "text/plain", ""); });
  server.begin();
  logLine("-- bridge ready, open http://192.168.4.1");
}

void loop() {
  server.handleClient();
  // When the scan has found a target but we're not connected yet, connect.
  if (!g_connected && g_target && !g_scanning) {
    connectToLock();
    if (!g_connected) { delete g_target; g_target = nullptr; } // avoid retry loop
  }
  delay(2);
}
