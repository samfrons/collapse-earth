/* contrast-m004.mjs — rendered-pixel contrast audit for Sheet 4 (MODEL M-004).

   Follows the method the lead page's CSS header insists on: contrast is
   measured from RENDERED SCREENSHOT PIXELS, not from modelled composites.
   The page lays two fixed grain layers over everything with mix-blend-mode,
   which darkens real grounds by roughly 15% — a declared-colour calculation
   reports passes that the screen does not deliver.

   Method: record each text element's rect and computed colour, blank every
   glyph in the plate, screenshot, then take the MODAL pixel behind each rect
   as that text's true background. Chrome does the PNG decoding (canvas +
   getImageData), so this needs no image library.

   Also checks non-text graphics against WCAG 1.4.11 (3:1): the flammable
   envelope stroke and the bed-cell ramp, which carry meaning here.

   Usage: node scratchpad/contrast-m004.mjs [url]                            */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9291;
const URL = process.argv[2] || "http://localhost:8199/collapse-methane-mines.html";

const chrome = spawn(CHROME, [
  "--headless", "--disable-gpu", "--hide-scrollbars",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + mkdtempSync(join(tmpdir(), "cm004-")),
  "--window-size=1440,1000", "about:blank"
], { stdio: "ignore" });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function wsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const l = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const p = l.find(t => t.type === "page");
      if (p) return p.webSocketDebuggerUrl;
    } catch { /* not up */ }
    await sleep(250);
  }
  throw new Error("chrome did not start");
}
const ws = new WebSocket(await wsUrl());
await new Promise(r => ws.addEventListener("open", r));
let id = 0; const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => {
  const i = ++id; ws.send(JSON.stringify({ id: i, method, params }));
  return new Promise(r => pending.set(i, r));
};
async function evalJs(expression, awaitPromise = false) {
  const resp = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise });
  const ev = resp.result || {};
  if (ev.exceptionDetails) {
    throw new Error(ev.exceptionDetails.exception?.description || ev.exceptionDetails.text);
  }
  return ev.result?.value;
}

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: URL });
await sleep(2800);

/* Bring the plate into view and collect every text element with its colour. */
const meta = JSON.parse(await evalJs(`(function(){
  var plate = document.getElementById("cowPlate");
  plate.scrollIntoView({block:"start"});
  window.scrollBy(0, -20);
  var out = [], seen = 0;
  function push(el, label){
    var t = (el.textContent||"").trim();
    if (!t) return;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    var cs = getComputedStyle(el);
    var size = parseFloat(cs.fontSize);
    var weight = parseInt(cs.fontWeight, 10) || 400;
    out.push({
      i: seen++, label: label || t.slice(0,34),
      color: cs.fill && cs.fill !== "none" && el.ownerSVGElement ? cs.fill : cs.color,
      sizePx: size, weight: weight,
      // WCAG large text: >=24px, or >=18.66px when bold
      large: size >= 24 || (size >= 18.66 && weight >= 700),
      x: r.x, y: r.y, w: r.width, h: r.height
    });
  }
  Array.prototype.forEach.call(plate.querySelectorAll("#cowSvg text"), function(t){ push(t); });
  push(document.getElementById("cowNote"), "live readout (prose mirror)");
  Array.prototype.forEach.call(plate.querySelectorAll(".readout-k"), function(t){ push(t,"plate caption"); });
  Array.prototype.forEach.call(plate.querySelectorAll("details > summary"), function(t){ push(t,"drawer summary"); });
  Array.prototype.forEach.call(plate.querySelectorAll("#cowGas label"), function(t){ push(t,"chip: "+t.textContent.trim()); });
  var pr = plate.getBoundingClientRect();
  return JSON.stringify({items: out, plate: {x:pr.x, y:pr.y, w:pr.width, h:pr.height}});
})()`));

/* Blank the GLYPHS ONLY. visibility:hidden would also remove the element's
   own background and border — which silently turns a selected chip (dark ink
   on a near-white pill) into "dark ink on the dark plate" and reports a false
   1.06:1 failure. Transparent ink leaves every painted ground intact. */
await evalJs(`(function(){
  var plate = document.getElementById("cowPlate");
  window.__restore = [];
  Array.prototype.forEach.call(plate.querySelectorAll("text, p, summary, label, span, b, tspan"), function(el){
    window.__restore.push([el, el.style.color, el.style.fill, el.style.textShadow]);
    el.style.setProperty("color", "transparent", "important");
    el.style.setProperty("fill", "transparent", "important");
    el.style.setProperty("text-shadow", "none", "important");
  });
  return true;
})()`);
await sleep(350);

const shot = await send("Page.captureScreenshot", { format: "png" });
const b64 = shot.result.data;

/* Decode in-page and take the modal pixel under each rect. */
await evalJs(`window.__shot = "data:image/png;base64,${b64}";`);
const samples = JSON.parse(await evalJs(`(async function(){
  var img = new Image();
  await new Promise(function(res, rej){ img.onload = res; img.onerror = rej; img.src = window.__shot; });
  var dpr = window.devicePixelRatio || 1;
  var c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  var ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  var items = ${JSON.stringify(meta.items)};
  return JSON.stringify(items.map(function(it){
    var x = Math.max(0, Math.round(it.x*dpr)), y = Math.max(0, Math.round(it.y*dpr));
    var w = Math.max(1, Math.round(it.w*dpr)), h = Math.max(1, Math.round(it.h*dpr));
    if (x+w > c.width) w = c.width - x;
    if (y+h > c.height) h = c.height - y;
    if (w <= 0 || h <= 0) return {i: it.i, bg: null};
    var d = ctx.getImageData(x, y, w, h).data;
    var counts = {}, best = null, bestN = 0;
    for (var p = 0; p < d.length; p += 4){
      var k = d[p]+","+d[p+1]+","+d[p+2];
      counts[k] = (counts[k]||0)+1;
      if (counts[k] > bestN){ bestN = counts[k]; best = k; }
    }
    return {i: it.i, bg: best, coverage: bestN/(w*h)};
  }));
})()`, true));

await evalJs(`(function(){
  (window.__restore||[]).forEach(function(p){
    p[0].style.color = p[1]; p[0].style.fill = p[2]; p[0].style.textShadow = p[3];
  });
  return true;
})()`);

/* --- contrast maths ----------------------------------------------------- */
function parseColor(s) {
  if (!s) return null;
  let m = s.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (m) return [+m[1], +m[2], +m[3]];
  m = s.match(/^#?([0-9a-f]{6})$/i);
  if (m) return [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16));
  m = s.match(/^(\d+),(\d+),(\d+)$/);
  if (m) return [+m[1], +m[2], +m[3]];
  return null;
}
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
function ratio(a, b) {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
const hex = (c) => "#" + c.map(v => Math.round(v).toString(16).padStart(2, "0")).join("");

const byI = new Map(samples.map(s => [s.i, s]));
let fails = 0, checked = 0;
console.log("\nSheet 4 — rendered-pixel contrast audit");
console.log("(modal background pixel behind each blanked glyph)\n");
const rows = [];
for (const it of meta.items) {
  const s = byI.get(it.i);
  const fg = parseColor(it.color), bg = s && s.bg ? parseColor(s.bg) : null;
  if (!fg || !bg) { rows.push([it.label, "—", "—", "—", "no sample"]); continue; }
  const r = ratio(fg, bg);
  const need = it.large ? 3.0 : 4.5;
  checked++;
  const ok = r >= need;
  if (!ok) fails++;
  rows.push([it.label.slice(0, 40), hex(fg), hex(bg),
    r.toFixed(2) + ":1", (ok ? "pass" : "FAIL") + " (needs " + need + ")"]);
}
const wid = [42, 9, 9, 9, 22];
const line = (c) => c.map((v, i) => String(v).padEnd(wid[i])).join(" ");
console.log(line(["element", "ink", "ground", "ratio", "verdict"]));
console.log(line(["-".repeat(40), "-".repeat(7), "-".repeat(7), "-".repeat(7), "-".repeat(20)]));
rows.sort((a, b) => parseFloat(a[3]) - parseFloat(b[3]));
rows.forEach(r => console.log(line(r)));

console.log(`\n  ${checked - fails}/${checked} text pairings pass WCAG AA.`);
if (fails) console.log(`  ${fails} FAILING — fix before this page drops noindex.`);

/* --- non-text graphics, WCAG 1.4.11 (3:1) -------------------------------
   Checked in BOTH bed states. 1.4.11 asks whether the OBJECT is perceivable,
   which a sufficient boundary satisfies — a muted fill inside a high-contrast
   outline is not a failure. What would be a failure is information carried by
   fill alone with no other channel. */
async function bedState(gasValue) {
  await evalJs(`(function(){
    var r = document.querySelector('#cowGas input[value="${gasValue}"]');
    r.checked = true; r.dispatchEvent(new Event('change', {bubbles:true}));
    return true; })()`);
  await sleep(250);
  return JSON.parse(await evalJs(`(function(){
    var svg = document.getElementById("cowSvg");
    var env = svg.querySelector("path[stroke='#F6A97F'], path[stroke]");
    var fills = [], stroke = null, outline = null;
    Array.prototype.forEach.call(svg.querySelectorAll("rect"), function(r){
      var f = r.getAttribute("fill");
      if (f && f !== "none") { fills.push(f); if (!stroke) stroke = r.getAttribute("stroke"); }
      else if (f === "none") outline = r.getAttribute("stroke");
    });
    /* the redundant channel: a polyline whose horizontal position encodes
       methane remaining, so the profile does not depend on hue at all */
    var profileLine = null, profileCasing = null;
    Array.prototype.forEach.call(svg.querySelectorAll("path[stroke]"), function(p){
      if ((p.getAttribute("d")||"").split("L").length <= 5) return;
      var s = (p.getAttribute("stroke")||"").toUpperCase();
      if (s === "#F2F8FC") profileLine = p.getAttribute("stroke");
      if (s === "#0B1A28") profileCasing = p.getAttribute("stroke");
    });
    var heldLabel = false;
    Array.prototype.forEach.call(svg.querySelectorAll("text"), function(t){
      if (/BED — HELD/.test(t.textContent)) heldLabel = true;
    });
    return JSON.stringify({
      envelopeStroke: env ? env.getAttribute("stroke") : null,
      cellFirst: fills[0] || null, cellLast: fills[fills.length-1] || null,
      cellStroke: stroke, bedOutline: outline, cellCount: fills.length,
      profileLine: profileLine, profileCasing: profileCasing, held: heldLabel
    });
  })()`));
}
const plateGround = parseColor(byI.get(0)?.bg) || [27, 41, 58];
console.log("\nNon-text graphics (WCAG 1.4.11, 3:1) — plate ground " + hex(plateGround) + ":");
for (const [state, gas] of [["bed HELD (sealed gas)", "sealed"], ["bed RUNNING (ventilation air)", "vam"]]) {
  const g = await bedState(gas);
  console.log("\n  " + state + "  (" + g.cellCount + " cells)");
  const pairs = [
    ["envelope stroke", g.envelopeStroke, plateGround, "plate"],
    ["bed outline", g.bedOutline, plateGround, "plate"],
    ["cell divider stroke", g.cellStroke, parseColor(g.cellFirst), "cell fill"],
    ["first cell fill", g.cellFirst, plateGround, "plate"],
    ["last cell fill", g.cellLast, plateGround, "plate"]
  ];
  for (const [name, col, against, againstName] of pairs) {
    const c = parseColor(col), a = Array.isArray(against) ? against : parseColor(against);
    if (!c || !a) { console.log("    " + name.padEnd(22) + "— not found"); continue; }
    const r = ratio(c, a);
    console.log("    " + name.padEnd(22) + hex(c) + " vs " + againstName.padEnd(9) +
      " " + r.toFixed(2) + ":1  " + (r >= 3 ? "pass" : "below 3:1"));
  }
  /* The requirement is that the PROFILE is perceivable, not that the ramp is
     high-contrast. A position-encoded polyline satisfies it outright and
     survives colour-vision deficiency and greyscale, which no hue ramp does. */
  if (g.held) {
    console.log("    " + "profile encoding".padEnd(22) +
      "n/a — bed is held by the interlock, and the state is stated in words");
  } else if (g.cellFirst && g.cellLast) {
    const r = ratio(parseColor(g.cellFirst), parseColor(g.cellLast));
    console.log("    " + "ramp ends vs each other".padEnd(22) + r.toFixed(2) + ":1" +
      (r >= 3 ? "  pass on hue alone"
        : g.profileLine ? "  low on hue alone — position channel below carries it"
        : "  FAIL — profile would be colour-only"));
    if (g.profileLine) {
      /* A cased line is perceivable if EITHER stroke clears 3:1 against the
         fill; measuring only the white core understates a deliberately
         two-tone mark. */
      const core = parseColor(g.profileLine), casing = parseColor(g.profileCasing || "#0B1A28");
      const worst = (c) => Math.min(ratio(c, parseColor(g.cellFirst)), ratio(c, parseColor(g.cellLast)));
      const best = Math.max(worst(core), worst(casing));
      console.log("    " + "profile line core".padEnd(22) + hex(core) + " vs fills " +
        worst(core).toFixed(2) + ":1");
      console.log("    " + "profile line casing".padEnd(22) + hex(casing) + " vs fills " +
        worst(casing).toFixed(2) + ":1");
      console.log("    " + "→ cased mark".padEnd(22) + best.toFixed(2) +
        ":1 on its better stroke  " + (best >= 3 ? "pass" : "FAIL"));
    }
  }
}

ws.close(); chrome.kill();
if (fails) process.exit(1);
