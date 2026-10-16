/*
 * Ksmart_ESP32.ino — single-file embedded build of Ksmart Web.
 *
 * Turns an ESP32 into a self-contained smart lock: it hosts the web UI over
 * WiFi and drives a relay/solenoid to open a physical door. This is the
 * embedded counterpart of the ksmart-web browser app — here the ESP32 *is*
 * the lock, so the multi-device BLE binding of the phone app collapses into
 * one door controlled directly by GPIO.
 *
 * Flash this one file (no external files, no SPIFFS upload): the whole web
 * page is embedded in PROGMEM and served by the built-in WebServer.
 *
 * ---- Hardware ----
 *   Relay / lock driver signal  -> GPIO 26  (RELAY_PIN)
 *   Status LED (optional)       -> GPIO 2   (onboard LED on many boards)
 *   Relay module VCC/GND        -> 5V / GND (use a proper driver + flyback
 *                                  diode for a solenoid; don't drive a coil
 *                                  straight from a GPIO)
 *
 * ---- Default access ----
 *   WiFi Access Point  SSID: "Ksmart-Lock"   password: "ksmart123"
 *   Open a browser at: http://192.168.4.1
 *   Pairing code (unlock + settings login), default: "123456"
 *
 * Change WiFi/STA and defaults in the CONFIG block below. The pairing code
 * and open-time are stored in NVS (Preferences) and survive reboots.
 *
 * Board: any ESP32. Requires the Arduino-ESP32 core (WiFi.h, WebServer.h,
 * Preferences.h are all part of it).
 */

#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>

/* ============================ CONFIG ============================ */
#define RELAY_PIN      26          // GPIO that drives the lock relay
#define RELAY_ACTIVE   HIGH        // level that opens the lock (flip if needed)
#define LED_PIN        2           // status LED (set to -1 to disable)

// AP mode: the ESP32 makes its own WiFi you connect to directly.
static const char* AP_SSID = "Ksmart-Lock";
static const char* AP_PASS = "ksmart123";   // >= 8 chars

// Optional: also join your home WiFi (station mode). Leave SSID empty to skip.
static const char* STA_SSID = "";
static const char* STA_PASS = "";

static const char* DEFAULT_PIN = "123456";  // first-boot pairing code
static const uint32_t DEFAULT_OPEN_MS = 3000;
/* =============================================================== */

WebServer server(80);
Preferences prefs;

String  g_pin;             // pairing code (unlock + panel login)
uint32_t g_openMs;         // how long the relay stays energised
String  g_token;           // current session token ("" = logged out)
bool    g_relayOn = false;
uint32_t g_relayOffAt = 0; // millis deadline to close the relay

// Small in-RAM ring buffer of unlock attempts.
struct Rec { uint32_t at; bool ok; };
static const int REC_MAX = 20;
Rec     g_recs[REC_MAX];
int     g_recCount = 0;
int     g_recHead = 0;

/* ---------------------------------------------------- Web page (PROGMEM) */
const char PAGE[] PROGMEM = R"HTML(<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Ksmart Lock</title>
<style>
:root{--gold:#bb9f70;--gold-deep:#ae8746;--gold-text:#bb8128;--blue:#367eb0;--bg:#ededed;--text:#282828;--muted:#8e8e8e;--green:#4caf50;--danger:#e2574c}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:#d8d8d8;color:var(--text)}
#app{max-width:420px;margin:0 auto;min-height:100vh;background:var(--bg);display:flex;flex-direction:column}
.bar{background:var(--blue);color:#fff;height:52px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:600}
.scr{flex:1;display:flex;flex-direction:column;align-items:center;padding:28px 24px}
.logo{width:104px;height:104px;border-radius:26px;background:linear-gradient(135deg,var(--gold),var(--gold-deep));display:flex;align-items:center;justify-content:center;margin:18px 0 6px;box-shadow:0 2px 12px rgba(0,0,0,.15)}
.logo svg{width:54px;height:54px;fill:#fff}
h1{font-size:22px;margin:4px 0 2px}.slogan{color:var(--muted);font-size:13px;margin-bottom:24px}
.field{display:flex;align-items:center;background:#fff;border:1px solid #e4e4e4;border-radius:26px;padding:0 16px;height:50px;width:100%;max-width:320px;margin-bottom:14px}
.field input{flex:1;border:none;outline:none;font-size:16px;background:transparent;padding:0 10px;text-align:center;letter-spacing:3px}
.btn{width:100%;max-width:320px;height:48px;border:none;border-radius:26px;font-size:16px;font-weight:600;color:#fff;cursor:pointer;background:linear-gradient(135deg,var(--gold),var(--gold-deep));box-shadow:0 4px 12px rgba(174,135,70,.35)}
.btn:active{transform:translateY(1px)}.btn.ghost{background:#fff;color:var(--gold-text);border:1px solid var(--gold);box-shadow:none}
.btn.danger{background:linear-gradient(135deg,#e2574c,#c0392b)}
.big{width:150px;height:150px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,var(--gold),var(--gold-deep));box-shadow:0 10px 26px rgba(174,135,70,.45);display:flex;align-items:center;justify-content:center;margin:22px 0}
.big svg{width:70px;height:70px;fill:#fff}.big:active{transform:scale(.95)}.big.busy{animation:p 1s infinite}
@keyframes p{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
.status{font-size:15px;color:var(--muted);min-height:22px;margin-bottom:10px}
.status.ok{color:var(--green)}.status.fail{color:var(--danger)}
.row{width:100%;max-width:340px;display:flex;justify-content:space-between;align-items:center;background:#fff;padding:14px 16px;border-radius:10px;margin-bottom:10px;font-size:14px}
.row .t{color:var(--muted);font-size:12px}
.card{width:100%;max-width:340px;background:#fff;border-radius:12px;padding:16px;margin-top:8px}
.card label{display:block;font-size:12px;color:var(--muted);margin:10px 0 4px}
.card input{width:100%;height:42px;border:1px solid #ddd;border-radius:8px;padding:0 12px;font-size:15px;outline:none}
.card input:focus{border-color:var(--gold)}
.links{margin-top:16px;font-size:13px}.links a{color:var(--gold-text);text-decoration:none;cursor:pointer}
.toast{position:fixed;left:50%;bottom:70px;transform:translateX(-50%);background:rgba(0,0,0,.82);color:#fff;padding:10px 18px;border-radius:22px;font-size:14px;opacity:0;transition:.2s;pointer-events:none}
.toast.show{opacity:1}
.copy{color:#bbb;font-size:12px;margin-top:30px}
</style></head>
<body><div id="app">
  <div class="bar" id="bar">Ksmart Lock</div>
  <div class="scr" id="scr"></div>
</div>
<div class="toast" id="toast"></div>
<script>
var LOCK='<svg viewBox="0 0 24 24"><path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v3H9V6a3 3 0 0 1 3-3zm0 11a2 2 0 0 1 1 3.73V20h-2v-2.27A2 2 0 0 1 12 14z"/></svg>';
var OPEN='<svg viewBox="0 0 24 24"><path d="M12 1a5 5 0 0 0-5 5h2a3 3 0 0 1 6 0v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm0 13a2 2 0 0 1 1 3.73V20h-2v-2.27A2 2 0 0 1 12 14z"/></svg>';
var tok=sessionStorage.getItem('ktok')||'';
var scr=document.getElementById('scr'),bar=document.getElementById('bar');
function toast(m){var t=document.getElementById('toast');t.textContent=m;t.classList.add('show');clearTimeout(t._);t._=setTimeout(function(){t.classList.remove('show')},1800)}
function api(path,body){return fetch(path,{method:body?'POST':'GET',headers:{'X-Token':tok,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}).then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j}})})}
function fmt(s){var d=Math.floor(s/60),m=d%60,h=Math.floor(d/60);return (s<60?s+'s ago':h>0?h+'h '+m+'m ago':m+'m ago')}

function viewLogin(){
  bar.textContent='Ksmart Lock';
  scr.innerHTML='<div class="logo">'+LOCK+'</div><h1>Ksmart</h1><div class="slogan">Smart Lock Leader</div>'+
    '<div class="field"><input id="pin" type="tel" maxlength="8" placeholder="Pairing code"></div>'+
    '<button class="btn" id="go">Unlock panel</button>'+
    '<div class="copy">copyright by bgwind</div>';
  document.getElementById('go').onclick=function(){
    var pin=document.getElementById('pin').value;
    api('/api/login',{pin:pin}).then(function(r){
      if(r.ok){tok=r.j.token;sessionStorage.setItem('ktok',tok);viewHome()}else toast(r.j.error||'Wrong pairing code')
    })
  };
  var i=document.getElementById('pin');i.focus();i.onkeydown=function(e){if(e.key==='Enter')document.getElementById('go').click()};
}

function viewHome(){
  bar.textContent='Ksmart Lock';
  scr.innerHTML='<div class="status" id="st">Ready</div>'+
    '<button class="big" id="open">'+OPEN+'</button>'+
    '<div class="links"><a id="rec">Unlock records</a> &nbsp;·&nbsp; <a id="set">Settings</a> &nbsp;·&nbsp; <a id="out">Exit</a></div>';
  var btn=document.getElementById('open'),st=document.getElementById('st');
  btn.onclick=function(){
    btn.classList.add('busy');st.className='status';st.textContent='Opening...';
    api('/api/unlock',{}).then(function(r){
      btn.classList.remove('busy');
      if(r.ok){st.className='status ok';st.textContent='Unlocked · open '+(r.j.openMs/1000)+'s';toast('Unlocked')}
      else{st.className='status fail';st.textContent=r.j.error||'Failed';if(r.j.error==='unauthorized'){viewLogin();}}
    })
  };
  document.getElementById('rec').onclick=viewRecords;
  document.getElementById('set').onclick=viewSettings;
  document.getElementById('out').onclick=function(){tok='';sessionStorage.removeItem('ktok');viewLogin()};
}

function viewRecords(){
  bar.textContent='Unlock records';
  scr.innerHTML='<div style="width:100%;max-width:340px">'+
    '<div class="links" style="margin:0 0 14px"><a id="back">&#8592; Back</a></div><div id="list">Loading...</div></div>';
  document.getElementById('back').onclick=viewHome;
  api('/api/records').then(function(r){
    var L=document.getElementById('list');
    if(!r.ok){L.textContent='-';return}
    if(!r.j.records.length){L.innerHTML='<div class="row">No records yet</div>';return}
    L.innerHTML=r.j.records.map(function(x){
      return '<div class="row"><div><div>'+(x.ok?'Open':'Denied')+'</div><div class="t">'+fmt(x.ago)+'</div></div>'+
        '<div style="color:'+(x.ok?'var(--green)':'var(--danger)')+';font-weight:600">'+(x.ok?'Success':'Failed')+'</div></div>'
    }).join('');
  });
}

function viewSettings(){
  bar.textContent='Settings';
  scr.innerHTML='<div style="width:100%;max-width:340px">'+
    '<div class="links" style="margin:0 0 14px"><a id="back">&#8592; Back</a></div>'+
    '<div class="card"><div style="font-weight:600;margin-bottom:6px">Change pairing code</div>'+
      '<label>Old code</label><input id="o" type="tel" maxlength="8">'+
      '<label>New code</label><input id="n" type="tel" maxlength="8">'+
      '<button class="btn" style="margin-top:14px" id="cp">Save code</button></div>'+
    '<div class="card"><div style="font-weight:600;margin-bottom:6px">Open time</div>'+
      '<label>Seconds the lock stays open</label><input id="t" type="number" min="1" max="30">'+
      '<button class="btn ghost" style="margin-top:14px" id="ct">Save time</button></div>';
  document.getElementById('back').onclick=viewHome;
  api('/api/settings').then(function(r){if(r.ok)document.getElementById('t').value=r.j.openMs/1000});
  document.getElementById('cp').onclick=function(){
    api('/api/pin',{old:document.getElementById('o').value,'new':document.getElementById('n').value}).then(function(r){
      toast(r.ok?'Pairing code changed':(r.j.error||'Failed'))})
  };
  document.getElementById('ct').onclick=function(){
    var s=parseInt(document.getElementById('t').value||'3');
    api('/api/settings',{openMs:s*1000}).then(function(r){toast(r.ok?'Saved':'Failed')})
  };
}

if(tok)viewHome();else viewLogin();
</script></body></html>)HTML";

/* --------------------------------------------------------- helpers */
String makeToken() {
  String t = "";
  for (int i = 0; i < 16; i++) t += "0123456789abcdef"[esp_random() & 0xF];
  return t;
}

bool authed() {
  if (g_token == "") return false;
  return server.header("X-Token") == g_token;
}

void addRecord(bool ok) {
  g_recs[g_recHead] = { millis(), ok };
  g_recHead = (g_recHead + 1) % REC_MAX;
  if (g_recCount < REC_MAX) g_recCount++;
}

void sendJson(int code, const String& json) {
  server.send(code, "application/json", json);
}

// Minimal body-field extractor (avoids pulling in a JSON lib for a few keys).
String field(const String& body, const String& key) {
  int k = body.indexOf("\"" + key + "\"");
  if (k < 0) return "";
  int c = body.indexOf(':', k);
  if (c < 0) return "";
  int i = c + 1;
  while (i < (int)body.length() && (body[i] == ' ' || body[i] == '\"')) i++;
  int start = i;
  while (i < (int)body.length() && body[i] != '\"' && body[i] != ',' && body[i] != '}') i++;
  String v = body.substring(start, i);
  v.trim();
  return v;
}

/* --------------------------------------------------------- handlers */
void handleRoot() {
  server.sendHeader("Cache-Control", "no-store");
  server.send_P(200, "text/html", PAGE);
}

void handleLogin() {
  String body = server.arg("plain");
  if (field(body, "pin") == g_pin) {
    g_token = makeToken();
    sendJson(200, "{\"token\":\"" + g_token + "\"}");
  } else {
    sendJson(401, "{\"error\":\"Wrong pairing code\"}");
  }
}

void handleUnlock() {
  if (!authed()) { sendJson(401, "{\"error\":\"unauthorized\"}"); return; }
  // Energise the relay; a timer in loop() releases it after g_openMs.
  digitalWrite(RELAY_PIN, RELAY_ACTIVE);
  if (LED_PIN >= 0) digitalWrite(LED_PIN, HIGH);
  g_relayOn = true;
  g_relayOffAt = millis() + g_openMs;
  addRecord(true);
  sendJson(200, "{\"openMs\":" + String(g_openMs) + "}");
}

void handleRecords() {
  if (!authed()) { sendJson(401, "{\"error\":\"unauthorized\"}"); return; }
  String out = "{\"records\":[";
  uint32_t now = millis();
  for (int n = 0; n < g_recCount; n++) {
    int idx = (g_recHead - 1 - n + REC_MAX * 2) % REC_MAX; // newest first
    const Rec& r = g_recs[idx];
    if (n) out += ",";
    out += "{\"ago\":" + String((now - r.at) / 1000) + ",\"ok\":" + (r.ok ? "true" : "false") + "}";
  }
  out += "]}";
  sendJson(200, out);
}

void handleGetSettings() {
  if (!authed()) { sendJson(401, "{\"error\":\"unauthorized\"}"); return; }
  sendJson(200, "{\"openMs\":" + String(g_openMs) + "}");
}

void handleSetSettings() {
  if (!authed()) { sendJson(401, "{\"error\":\"unauthorized\"}"); return; }
  String body = server.arg("plain");
  long ms = field(body, "openMs").toInt();
  if (ms < 500) ms = 500;
  if (ms > 30000) ms = 30000;
  g_openMs = ms;
  prefs.putULong("openMs", g_openMs);
  sendJson(200, "{\"openMs\":" + String(g_openMs) + "}");
}

void handleChangePin() {
  if (!authed()) { sendJson(401, "{\"error\":\"unauthorized\"}"); return; }
  String body = server.arg("plain");
  if (field(body, "old") != g_pin) { sendJson(400, "{\"error\":\"Old code is wrong\"}"); return; }
  String np = field(body, "new");
  if (np.length() < 4 || np.length() > 8) { sendJson(400, "{\"error\":\"Code must be 4-8 digits\"}"); return; }
  g_pin = np;
  prefs.putString("pin", g_pin);
  sendJson(200, "{\"ok\":true}");
}

/* --------------------------------------------------------- setup/loop */
void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_ACTIVE == HIGH ? LOW : HIGH); // start closed
  if (LED_PIN >= 0) { pinMode(LED_PIN, OUTPUT); digitalWrite(LED_PIN, LOW); }

  prefs.begin("ksmart", false);
  g_pin = prefs.getString("pin", DEFAULT_PIN);
  g_openMs = prefs.getULong("openMs", DEFAULT_OPEN_MS);

  // Access Point so you can connect with no router; also join STA if set.
  WiFi.mode((strlen(STA_SSID) > 0) ? WIFI_AP_STA : WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.print("AP IP: "); Serial.println(WiFi.softAPIP());
  if (strlen(STA_SSID) > 0) {
    WiFi.begin(STA_SSID, STA_PASS);
    Serial.print("Joining "); Serial.println(STA_SSID);
    for (int i = 0; i < 20 && WiFi.status() != WL_CONNECTED; i++) { delay(500); Serial.print("."); }
    if (WiFi.status() == WL_CONNECTED) { Serial.print("\nSTA IP: "); Serial.println(WiFi.localIP()); }
  }

  // Tell the server to retain the X-Token header so authed() can read it.
  const char* headerKeys[] = { "X-Token" };
  server.collectHeaders(headerKeys, 1);

  server.on("/", HTTP_GET, handleRoot);
  server.on("/api/login", HTTP_POST, handleLogin);
  server.on("/api/unlock", HTTP_POST, handleUnlock);
  server.on("/api/records", HTTP_GET, handleRecords);
  server.on("/api/settings", HTTP_GET, handleGetSettings);
  server.on("/api/settings", HTTP_POST, handleSetSettings);
  server.on("/api/pin", HTTP_POST, handleChangePin);
  server.onNotFound([]() { server.sendHeader("Location", "/"); server.send(302, "text/plain", ""); });
  server.begin();
  Serial.println("Ksmart lock ready.");
}

void loop() {
  server.handleClient();
  // Auto-close the relay once the open window elapses.
  if (g_relayOn && (int32_t)(millis() - g_relayOffAt) >= 0) {
    digitalWrite(RELAY_PIN, RELAY_ACTIVE == HIGH ? LOW : HIGH);
    if (LED_PIN >= 0) digitalWrite(LED_PIN, LOW);
    g_relayOn = false;
  }
}
