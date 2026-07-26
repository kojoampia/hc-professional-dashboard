#!/usr/bin/env python3
"""Capture UI baseline screenshots via headless Chrome CDP."""
import asyncio, base64, json, subprocess, sys, time, urllib.request, os, signal

import websockets

PORT = 9223
BASE = "http://localhost:4200"
OUT = sys.argv[1]
TOKEN = open(sys.argv[2]).read().strip()
SETTLE = float(os.environ.get("SETTLE", "6"))

UNAUTH = [("welcome", "/"), ("login", "/login"), ("register", "/account/register")]
AUTH = [
    ("dashboard", "/"),
    ("patients", "/patients"),
    ("cases", "/cases"),
    ("duty-roster", "/duty-roster"),
    ("med-case", "/med-case"),
    ("admin-health", "/admin/health"),
    ("admin-metrics", "/admin/metrics"),
    ("account-settings", "/account/settings"),
    ("account-password", "/account/password"),
]
MOBILE_ROUTES = {"dashboard", "patients", "cases", "duty-roster", "login", "welcome"}
DESKTOP = (1440, 900, False)
MOBILE = (390, 844, True)

msg_id = 0

async def cmd(ws, method, params=None):
    global msg_id
    msg_id += 1
    this_id = msg_id
    await ws.send(json.dumps({"id": this_id, "method": method, "params": params or {}}))
    while True:
        resp = json.loads(await ws.recv())
        if resp.get("id") == this_id:
            return resp.get("result", {})

async def shoot(ws, name, path, width, height, mobile, suffix):
    await cmd(ws, "Emulation.setDeviceMetricsOverride",
              {"width": width, "height": height, "deviceScaleFactor": 1, "mobile": mobile})
    await cmd(ws, "Page.navigate", {"url": BASE + path})
    await asyncio.sleep(SETTLE)
    shot = await cmd(ws, "Page.captureScreenshot", {"captureBeyondViewport": True})
    fn = os.path.join(OUT, f"{name}--{suffix}.png")
    with open(fn, "wb") as f:
        f.write(base64.b64decode(shot["data"]))
    print("saved", fn)

async def main():
    os.makedirs(OUT, exist_ok=True)
    req = urllib.request.Request(f"http://localhost:{PORT}/json/new?about:blank", method="PUT")
    tab = json.load(urllib.request.urlopen(req))
    async with websockets.connect(tab["webSocketDebuggerUrl"], max_size=64 * 1024 * 1024) as ws:
        await cmd(ws, "Page.enable")
        await cmd(ws, "Runtime.enable")

        # ---- unauthenticated shots (no token in storage) ----
        for name, path in UNAUTH:
            w, h, m = DESKTOP
            await shoot(ws, name, path, w, h, m, "desktop")
            if name in MOBILE_ROUTES:
                w, h, m = MOBILE
                await shoot(ws, name, path, w, h, m, "mobile")

        # ---- inject JWT on a lightweight same-origin doc, then authed shots ----
        await cmd(ws, "Page.navigate", {"url": BASE + "/favicon.ico"})
        await asyncio.sleep(1.5)
        await cmd(ws, "Runtime.evaluate",
                  {"expression": f"localStorage.setItem('hpd-authenticationToken', JSON.stringify({json.dumps(TOKEN)}))"})
        for name, path in AUTH:
            w, h, m = DESKTOP
            await shoot(ws, name, path, w, h, m, "desktop")
            if name in MOBILE_ROUTES:
                w, h, m = MOBILE
                await shoot(ws, name, path, w, h, m, "mobile")

chrome = subprocess.Popen(
    ["google-chrome", "--headless=new", f"--remote-debugging-port={PORT}",
     "--no-first-run", "--disable-gpu", "--user-data-dir=/tmp/claude-1000/hc-baseline-profile",
     "--window-size=1440,900", "about:blank"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    time.sleep(2.5)
    asyncio.run(main())
finally:
    chrome.send_signal(signal.SIGTERM)
    time.sleep(1)
print("done")
