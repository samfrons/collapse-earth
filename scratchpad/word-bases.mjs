/* word-bases.mjs — reconstruction of the word-budget counter the lead page's
   header describes (the original was session-local and lost).

   Usage:  node scratchpad/word-bases.mjs <url>
   Requires: Google Chrome at the standard macOS path; a static server for the url.

   Bases, per the definition in collapse-v2-coresample.html's header:
     A. prose only — SVG text excluded
     B. all rendered text, SVG included   <- the ~2,500 target's basis
   Common rules for both: measured at 1440×900 in the default state — nothing
   expanded, a closed <details> contributing only its <summary>; a word is a
   whitespace-separated token containing at least one alphanumeric character.
   This implementation also excludes: <noscript>, aria-hidden subtrees, the
   shared #tip, and .sr screen-reader-only text. State the basis when quoting;
   only deltas measured with THIS script are comparable to each other. */
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
/* Port 0 = let the OS pick, then read the port back from the spawned profile's
   DevToolsActivePort. A fixed port silently ATTACHES to an already-running
   Chrome and measures that instance's front tab — i.e. counts the wrong
   document and reports it as this page's budget. */
const PORT = 0;
const URL = process.argv[2];
if (!URL) { console.error("usage: node word-bases.mjs <url>"); process.exit(1); }

const PROFILE = mkdtempSync(join(tmpdir(), "wb-prof-"));
const chrome = spawn(CHROME, [
  "--headless", "--disable-gpu", "--hide-scrollbars",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + PROFILE,
  "--window-size=1440,900", "about:blank"
], { stdio: "ignore" });

/* the real port, straight from the instance we launched */
async function ownPort() {
  for (let i = 0; i < 60; i++) {
    try {
      const first = readFileSync(join(PROFILE, "DevToolsActivePort"), "utf8").split("\n")[0].trim();
      if (first) return Number(first);
    } catch {}
    await sleep(200);
  }
  throw new Error("Chrome never wrote DevToolsActivePort");
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function wsUrl() {
  const port = await ownPort();
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find(t => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("chrome did not start");
}

let id = 0; const pending = new Map(); let ws; let loadFired = () => {};
/* Every pending command must settle, or the awaiting call hangs forever and
   `finally` never runs — leaving an orphaned Chrome behind. */
function failAllPending(err) {
  for (const [, p] of pending) p.rej(err);
  pending.clear();
}
function send(method, params = {}) {
  return new Promise((res, rej) => {
    const msgId = ++id;
    const timer = setTimeout(() => {
      if (pending.delete(msgId)) rej(new Error(`CDP timeout: ${method}`));
    }, 30000);
    pending.set(msgId, {
      res: (v) => { clearTimeout(timer); res(v); },
      rej: (e) => { clearTimeout(timer); rej(e); }
    });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

const COUNTER = String(function count() {
  function excluded(el) {
    for (var n = el; n; n = n.parentElement || (n.getRootNode && n.getRootNode().host)) {
      if (!n.tagName) continue;
      var tag = n.tagName.toLowerCase();
      if (tag === "noscript" || tag === "script" || tag === "style") return true;
      if (n.id === "tip") return true;
      if (n.getAttribute && n.getAttribute("aria-hidden") === "true") return true;
      if (n.classList && n.classList.contains("sr")) return true;
      if (n.hasAttribute && n.hasAttribute("hidden")) return true;
      if (tag === "details" ) { /* handled via summary rule below */ }
    }
    return false;
  }
  function inClosedDetails(node) {
    /* text inside a closed <details> counts only if it is inside the summary */
    for (var n = node.parentElement; n; n = n.parentElement) {
      if (n.tagName && n.tagName.toLowerCase() === "details" && !n.open) {
        for (var s = node.parentElement; s && s !== n; s = s.parentElement) {
          if (s.tagName && s.tagName.toLowerCase() === "summary") return false;
        }
        return true;
      }
    }
    return false;
  }
  function tokens(s) {
    return (s.match(/\S+/g) || []).filter(function (t) { return /[A-Za-z0-9]/.test(t); }).length;
  }
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  var a = 0, b = 0, node;
  while ((node = walker.nextNode())) {
    var el = node.parentElement;
    if (!el) continue;
    if (excluded(el)) continue;
    if (inClosedDetails(node)) continue;
    var rects = el.getClientRects ? el.getClientRects() : [];
    var inSvg = !!(el.ownerSVGElement || el.tagName.toLowerCase() === "svg");
    if (!inSvg && rects.length === 0) continue;         /* not rendered */
    var style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;
    var n2 = tokens(node.textContent);
    b += n2;
    if (!inSvg) a += n2;
  }
  return { A: a, B: b, height: document.body.scrollHeight };
}) + "; count()";

try {
  ws = new WebSocket(await wsUrl());
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      m.error ? p.rej(new Error(m.error.message)) : p.res(m.result);
    } else if (m.method === "Page.loadEventFired") {
      loadFired();
    }
  };
  ws.onerror = () => failAllPending(new Error("CDP socket error"));
  ws.onclose = () => failAllPending(new Error("CDP socket closed"));
  chrome.on("exit", (code) => failAllPending(new Error("Chrome exited: " + code)));
  await send("Page.enable");
  const loaded = new Promise((res) => { loadFired = res; });
  await send("Page.navigate", { url: URL });
  /* A fixed sleep counts whatever happened to have rendered by then — which
     makes the budget non-repeatable. Wait for load, for webfonts (they change
     SVG text metrics), and for the page's own instruments to exist. */
  await Promise.race([loaded, sleep(20000)]);
  for (let i = 0; i < 60; i++) {
    const ready = await send("Runtime.evaluate", {
      expression: `(document.readyState === "complete") && document.fonts.status === "loaded"
        && !!document.querySelector("#seamSvg text")`,
      returnByValue: true
    });
    if (ready.result.value === true) break;
    await sleep(250);
  }
  const r = await send("Runtime.evaluate", { expression: COUNTER, returnByValue: true });
  const v = r.result.value;
  console.log(URL);
  console.log("basis A (prose, no SVG): " + v.A);
  console.log("basis B (all rendered):  " + v.B);
  console.log("page height at 1440:     " + v.height + "px");
} finally {
  chrome.kill();
}
