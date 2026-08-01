/* m004-checks.mjs — CDP interaction checks for Sheet 4 (MODEL M-004).
   Same Chrome/launch pattern as word-bases.mjs and shot.mjs.

   Usage: node scratchpad/m004-checks.mjs [url]                              */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9261;
const URL = process.argv[2] || "http://localhost:8199/collapse-methane-mines.html";

const chrome = spawn(CHROME, [
  "--headless", "--disable-gpu", "--hide-scrollbars",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + mkdtempSync(join(tmpdir(), "m004-")),
  "--window-size=1440,900", "about:blank"
], { stdio: "ignore" });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function wsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const p = list.find(t => t.type === "page");
      if (p) return p.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error("chrome did not start");
}

const ws = new WebSocket(await wsUrl());
await new Promise(r => ws.addEventListener("open", r));
let id = 0; const pending = new Map();
const consoleLines = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === "Runtime.consoleAPICalled") {
    consoleLines.push(m.params.type + ": " +
      m.params.args.map(a => a.value ?? a.description ?? "").join(" "));
  }
  if (m.method === "Runtime.exceptionThrown") {
    consoleLines.push("EXCEPTION: " + (m.params.exceptionDetails?.exception?.description
      || m.params.exceptionDetails?.text));
  }
});
function send(method, params = {}) {
  const i = ++id; ws.send(JSON.stringify({ id: i, method, params }));
  return new Promise(r => pending.set(i, r));
}
/* Runtime.evaluate nests the payload twice; unwrap once here so callers don't. */
async function evalJs(expression) {
  const resp = await send("Runtime.evaluate", { expression, returnByValue: true });
  const ev = resp.result || {};
  if (ev.exceptionDetails) {
    throw new Error("page threw: " + (ev.exceptionDetails.exception?.description
      || ev.exceptionDetails.text));
  }
  return ev.result?.value;
}

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: URL });
await sleep(2600);

let pass = 0; const fails = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fails.push(name + (detail ? " — " + detail : "")); console.log("  ✗ " + name + (detail ? " — " + detail : "")); }
}

/* Select a gas by its radio value and let the redraw settle. */
async function pickGas(v) {
  await evalJs(`(function(){
    var r = document.querySelector('#cowGas input[value="${v}"]');
    r.checked = true;
    r.dispatchEvent(new Event('change', {bubbles:true}));
    return true;
  })()`);
  await sleep(220);
}
async function setTarget(v) {
  await evalJs(`(function(){
    var s = document.getElementById('cowTgt');
    s.value = '${v}';
    s.dispatchEvent(new Event('input', {bubbles:true}));
    return true;
  })()`);
  await sleep(220);
}
const noteText = () => evalJs("document.getElementById('cowNote').textContent");
const svgAria = () => evalJs("document.getElementById('cowSvg').getAttribute('aria-label')");
const bedLabel = () => evalJs(`(function(){
  var t = document.querySelectorAll('#cowSvg text');
  for (var i=0;i<t.length;i++){ if(/BED|PACKED/.test(t[i].textContent)) return t[i].textContent; }
  return null; })()`);

console.log("\nSheet 4 — MODEL M-004\n");

check("plate and svg present", await evalJs(
  "!!document.getElementById('cowPlate') && !!document.getElementById('cowSvg')"));
check("model library loaded", (await evalJs("typeof window.COLLAPSE_BIO")) === "object");
check("svg carries a viewBox and is fluid-width",
  (await evalJs("document.getElementById('cowSvg').getAttribute('width')")) === "100%" &&
  !!(await evalJs("document.getElementById('cowSvg').getAttribute('viewBox')")));

/* --- the three abandoned-mine cases must all trip the interlock --------- */
for (const [v, label] of [["sealed", "sealed"], ["leaky", "leaky"], ["late", "late-life"]]) {
  await pickGas(v);
  const n = await noteText(), a = await svgAria(), b = await bedLabel();
  check(label + ": path reported as crossing", /inside the\s+explosive envelope|inside the explosive envelope/.test(n), n.slice(0, 90));
  check(label + ": aria mirrors the crossing", /passes through the flammable envelope/.test(a));
  check(label + ": bed is held, not scored", b === "BED — HELD", "bed label = " + b);
  check(label + ": states both ends safe", /Both ends of the path are safe/.test(n));
}

/* --- ventilation air is the contrast case: no dilution needed ----------- */
await pickGas("vam");
{
  const n = await noteText(), a = await svgAria(), b = await bedLabel();
  /* Assert the behaviour, not one phrasing: the note must not report a
     crossing, and must say why there isn't one (either it never enters, or
     no air is added at all because the stream is already dilute enough). */
  check("ventilation air: no crossing",
    !/inside the explosive envelope/.test(n) &&
    /never enters the envelope|no path to cross/.test(n), n.slice(0, 110));
  check("ventilation air: aria says stays outside", /stays outside the flammable envelope/.test(a));
  check("ventilation air: bed runs", b === "PACKED BED", "bed label = " + b);
  check("ventilation air: labelled as the contrast case, not an AMM stream",
    /active mine|not an abandoned-mine|NOT an abandoned-mine/i.test(n), n.slice(0, 120));
}

/* --- the bed actually shades a profile when it runs --------------------- */
check("bed cells vary down the column when running", await evalJs(`(function(){
  var r = document.querySelectorAll('#cowSvg rect');
  var fills = [];
  for (var i=0;i<r.length;i++){ var f=r[i].getAttribute('fill'); if(f && f!=='none') fills.push(f); }
  var uniq = {}; fills.forEach(function(f){uniq[f]=1;});
  return Object.keys(uniq).length > 3;
})()`), "expected a gradient across the 14 cells");

/* --- the target slider moves the answer --------------------------------- */
await pickGas("sealed");
await setTarget("0.3");
const n03 = await noteText();
await setTarget("4.5");
const n45 = await noteText();
check("target slider changes the reported blend", n03 !== n45);
check("slider readout tracks", (await evalJs("document.getElementById('cowTgtVal').textContent")) === "4.5%");

/* --- discipline: never present a hazard as a target --------------------- */
await pickGas("sealed");
{
  const n = (await noteText()).toLowerCase();
  check("no hazardous state described as optimal/acceptable",
    !/optimal|recommended target|acceptable/.test(n));
}

/* --- no absolute performance figure anywhere on the sheet --------------- */
check("sheet states no removal efficiency for the modelled bed", await evalJs(`(function(){
  var t = document.getElementById('cowPlate').textContent;
  // Limbri's MEASURED 19.7% removal is quoted in sources, not on the plate;
  // the plate must not claim a modelled removal or elimination capacity.
  return !/removal efficiency of|removes\\s+\\d|elimination capacity of\\s+\\d/i.test(t);
})()`));

/* --- keyboard reachability ---------------------------------------------- */
check("every control is a real focusable element", await evalJs(`(function(){
  var radios = document.querySelectorAll('#cowGas input[type=radio]');
  var slider = document.getElementById('cowTgt');
  return radios.length === 4 && slider && slider.tagName === 'INPUT' &&
    !!slider.getAttribute('aria-label');
})()`));

/* --- the load-time gate -------------------------------------------------- */
const pend = consoleLines.filter(l => /PENDING constants/.test(l));
console.log("\n  gate: " + (pend.length ? pend[0].replace(/^warning: /, "") : "zero PENDING"));
const exc = consoleLines.filter(l => /^EXCEPTION/.test(l));
check("no uncaught exceptions", exc.length === 0, exc.join(" | "));

console.log(`\n  ${pass} passing, ${fails.length} failing\n`);
ws.close(); chrome.kill();
if (fails.length) process.exit(1);
