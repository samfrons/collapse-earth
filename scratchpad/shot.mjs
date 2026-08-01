/* shot.mjs — headless screenshot over CDP, same Chrome/launch pattern as
   word-bases.mjs so there is one way to drive a browser in this repo.

   Usage: node scratchpad/shot.mjs <url> <out.png> [width] [height] [waitMs]  */
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9244;
const [, , URL, OUT, w = "1100", h = "560", waitMs = "700"] = process.argv;
if (!URL || !OUT) { console.error("usage: node shot.mjs <url> <out.png> [w] [h] [waitMs]"); process.exit(1); }

const chrome = spawn(CHROME, [
  "--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + mkdtempSync(join(tmpdir(), "shot-prof-")),
  "--window-size=" + w + "," + h, "about:blank"
], { stdio: "ignore" });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function wsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = list.find(t => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* chrome not up yet */ }
    await sleep(250);
  }
  throw new Error("chrome did not start");
}

const ws = new WebSocket(await wsUrl());
await new Promise(r => ws.addEventListener("open", r));

let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
function send(method, params = {}) {
  const msgId = ++id;
  ws.send(JSON.stringify({ id: msgId, method, params }));
  return new Promise(r => pending.set(msgId, r));
}

await send("Page.enable");
await send("Runtime.enable");
const logs = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.method === "Runtime.consoleAPICalled") {
    logs.push(m.params.type + ": " + m.params.args.map(a => a.value ?? a.description ?? "").join(" "));
  }
  if (m.method === "Runtime.exceptionThrown") {
    logs.push("EXCEPTION: " + (m.params.exceptionDetails?.exception?.description
      || m.params.exceptionDetails?.text));
  }
});

await send("Page.navigate", { url: URL });
await sleep(Number(waitMs));

/* Optional 8th arg: JS to run before capturing — for driving a control into
   the state you want pictured. */
const PRE = process.argv[8];
if (PRE) {
  await send("Runtime.evaluate", { expression: PRE, returnByValue: true });
  await sleep(400);
}

/* Optional 7th arg: a selector to scroll to and clip. Lets one script serve
   both whole-page shots and single-plate shots. */
const SEL = process.argv[7];
let clip;
if (SEL) {
  const resp = await send("Runtime.evaluate", {
    expression: `(function () { var e = document.querySelector(${JSON.stringify(SEL)});
      if (!e) return null;
      e.scrollIntoView({block:"center"});
      var b = e.getBoundingClientRect();
      return JSON.stringify({x:b.x+window.scrollX, y:b.y+window.scrollY, width:b.width, height:b.height});
    })()`, returnByValue: true
  });
  /* CDP nests twice here: the message is {id, result:{result:{type,value}}}.
     Page.captureScreenshot below is only nested once, which is why the two
     call sites unwrap differently. */
  const ev = resp.result || {};
  if (ev.exceptionDetails) {
    console.error("evaluate threw: " + JSON.stringify(ev.exceptionDetails.exception
      || ev.exceptionDetails.text));
    process.exit(1);
  }
  const r = ev.result;
  if (!r || !r.value) { console.error("selector not found: " + SEL); process.exit(1); }
  await sleep(500);
  clip = { ...JSON.parse(r.value), scale: 1 };
}

const { result } = await send("Page.captureScreenshot",
  { format: "png", captureBeyondViewport: true, ...(clip ? { clip } : {}) });
writeFileSync(OUT, Buffer.from(result.data, "base64"));
console.log("wrote " + OUT);
if (logs.length) { console.log("--- console ---"); logs.forEach(l => console.log("  " + l)); }

ws.close();
chrome.kill();
