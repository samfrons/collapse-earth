/* lead-fieldlink-checks.mjs — the assay field's field-study link (Aftermine).

   Two things this pins, because both were got wrong while building it:
   - The marker group's click opens the LEDGER <details> (openIv), not the
     right-slide dossier tray. Asserting on the tray reports a false failure.
   - Synthetic MouseEvents do not drive it; use Input.dispatchMouseEvent, and
     scroll the plot into view and let the scroll-reveal settle BEFORE
     measuring coordinates, or the click lands off-screen.

   Usage: node scratchpad/lead-fieldlink-checks.mjs [url]                    */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9331;
const URL = process.argv[2] || "http://localhost:8199/collapse-v2-coresample.html";

const chrome = spawn(CHROME, [
  "--headless", "--disable-gpu", "--hide-scrollbars",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + mkdtempSync(join(tmpdir(), "lfl-")),
  "--window-size=1440,900", "about:blank"
], { stdio: "ignore" });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ws;
for (let i = 0; i < 40; i++) {
  try {
    const l = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    const p = l.find(t => t.type === "page");
    if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; }
  } catch { /* not up */ }
  await sleep(250);
}
await new Promise(r => ws.addEventListener("open", r));
let id = 0; const pending = new Map(); const exc = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") {
    exc.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
  }
});
const send = (method, params = {}) => {
  const i = ++id; ws.send(JSON.stringify({ id: i, method, params }));
  return new Promise(r => pending.set(i, r));
};
async function ev(expression, awaitPromise = false) {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description);
  return r.result?.result?.value;
}

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: URL });
await sleep(3500);
await ev(`document.querySelector('#fieldSvg').scrollIntoView({block:"center"})`);
await sleep(900);

let pass = 0; const fails = [];
const ck = (n, c, d) => { if (c) { pass++; console.log("  ✓ " + n); }
  else { fails.push(n); console.log("  ✗ " + n + (d ? " — " + d : "")); } };

console.log("\nAssay field — Aftermine field-study link\n");

const info = JSON.parse(await ev(`(function(){
  var a = document.querySelector("#fieldSvg a.fd-fw");
  if (!a) return JSON.stringify({found:false});
  var mk = document.querySelector('#fieldSvg g.fd-mk[data-iv="methane-removal"]');
  var hit = mk.querySelector(".fd-hit"), disc = mk.querySelector(".fd-disc");
  var r = a.getBoundingClientRect(), hr = hit.getBoundingClientRect(), dr = disc.getBoundingClientRect();
  return JSON.stringify({
    found: true, href: a.getAttribute("href"), aria: a.getAttribute("aria-label"),
    text: a.querySelector("text").textContent,
    count: document.querySelectorAll("#fieldSvg a.fd-fw").length,
    overlapsHit: !(r.top >= hr.bottom || r.bottom <= hr.top),
    overlapsDisc: !(r.top >= dr.bottom || r.bottom <= dr.top),
    gapPx: +(r.top - hr.bottom).toFixed(1),
    rect: {x:r.x, y:r.y, w:r.width, h:r.height}
  });
})()`));

ck("link is rendered on the field", info.found);
ck("points at the methane page", info.href === "collapse-methane-mines.html", info.href);
ck("names the project", /AFTERMINE/i.test(info.text), info.text);
ck("appears only on the category that has a field study", info.count === 1, "count=" + info.count);
ck("carries a full accessible name", (info.aria || "").length > 25, info.aria);
ck("sits clear of the marker's hit area", info.overlapsHit === false, "gap " + info.gapPx + "px");
ck("sits clear of the disc", info.overlapsDisc === false);
ck("takes its own tab stop", await ev(`(function(){
  var a = document.querySelector("#fieldSvg a.fd-fw"); a.focus();
  return document.activeElement === a ||
    (document.activeElement.closest && document.activeElement.closest("a.fd-fw") === a);
})()`));

/* The marker's own behaviour must survive: clicking the disc opens that
   intervention's ledger entry, which is where the dossier prose lives. */
const before = await ev(`(document.getElementById("iv-methane-removal")||{}).open`);
const pt = JSON.parse(await ev(`(function(){
  var d = document.querySelector('#fieldSvg g.fd-mk[data-iv="methane-removal"] .fd-disc').getBoundingClientRect();
  return JSON.stringify({x: Math.round(d.x + d.width/2), y: Math.round(d.y + d.height/2)});
})()`));
for (const type of ["mousePressed", "mouseReleased"]) {
  await send("Input.dispatchMouseEvent", { type, x: pt.x, y: pt.y, button: "left", clickCount: 1 });
}
await sleep(900);
const after = await ev(`(document.getElementById("iv-methane-removal")||{}).open`);
ck("disc still opens the ledger entry (link did not steal the click)", before === false && after === true);

/* Rendered-pixel contrast of the link, same method as contrast-m004.mjs:
   blank the glyph, screenshot, take the modal pixel behind it. */
const fg = await ev(`getComputedStyle(document.querySelector("#fieldSvg .fd-fwt")).fill`);
await ev(`(function(){ var t=document.querySelector("#fieldSvg .fd-fwt");
  window.__f=t.style.fill; t.style.setProperty("fill","transparent","important"); return 1; })()`);
await sleep(300);
const shot = (await send("Page.captureScreenshot", { format: "png" })).result.data;
await ev(`window.__shot="data:image/png;base64,${shot}";`);
const bg = await ev(`(async function(){
  var img=new Image();
  await new Promise(function(res,rej){img.onload=res;img.onerror=rej;img.src=window.__shot;});
  var dpr=window.devicePixelRatio||1, c=document.createElement("canvas");
  c.width=img.width; c.height=img.height; var x2=c.getContext("2d"); x2.drawImage(img,0,0);
  var r=${JSON.stringify(info.rect)};
  var d=x2.getImageData(Math.round(r.x*dpr),Math.round(r.y*dpr),
    Math.max(1,Math.round(r.w*dpr)),Math.max(1,Math.round(r.h*dpr))).data;
  var n={},best=null,bn=0;
  for(var p=0;p<d.length;p+=4){var k=d[p]+","+d[p+1]+","+d[p+2];n[k]=(n[k]||0)+1;if(n[k]>bn){bn=n[k];best=k;}}
  return best;
})()`, true);
await ev(`(function(){ document.querySelector("#fieldSvg .fd-fwt").style.fill=window.__f||""; return 1; })()`);

const parse = (s) => {
  let m = String(s).match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (m) return [+m[1], +m[2], +m[3]];
  m = String(s).match(/^#?([0-9a-f]{6})$/i);
  if (m) return [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16));
  m = String(s).match(/^(\d+),(\d+),(\d+)$/);
  return m ? [+m[1], +m[2], +m[3]] : null;
};
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const f = parse(fg), b = parse(bg);
if (f && b) {
  const ratio = (Math.max(lum(f), lum(b)) + 0.05) / (Math.min(lum(f), lum(b)) + 0.05);
  const hex = (c) => "#" + c.map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
  ck("contrast ≥ 4.5:1 on the rendered ground",
    ratio >= 4.5, hex(f) + " on " + hex(b) + " = " + ratio.toFixed(2) + ":1");
  if (ratio >= 4.5) console.log("      " + hex(f) + " on " + hex(b) + " = " + ratio.toFixed(2) + ":1");
} else {
  ck("contrast measurable", false, "fg=" + fg + " bg=" + bg);
}

ck("no uncaught exceptions", exc.length === 0, exc.join(" | "));
console.log(`\n  ${pass} passing, ${fails.length} failing\n`);
ws.close(); chrome.kill();
if (fails.length) process.exit(1);
