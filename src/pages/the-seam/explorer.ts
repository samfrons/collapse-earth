/**
 * Sheet 3 — the model. A digital-twin explorer.
 *
 * The mine as a museum cutaway diorama with the unit on the surface, orbitable, with a
 * five-station tour and live scenarios driven by **the same model functions as the
 * instruments above** — `dryFactor`, `floodedFactor`, `concentration`, `route`. The
 * geometry is illustrative; the behaviour is this page's own physics.
 *
 * Three.js is loaded only when this section approaches, and everything degrades: no
 * WebGL gives a stated fallback, reduced motion gives still frames, and no JavaScript
 * at all leaves the two drawing sheets, which already carry the content.
 */

import type * as THREE_NS from 'three';

import { amm } from '@/data';
import type { NonEmpty } from '@/lib/array';
import { byId, prefersReducedMotion, setText } from '@/lib/dom';
import { P } from './params';
import { concentration, dryFactor, floodedFactor, mineTwin, route } from './twin-model';

type THREE = typeof THREE_NS;

interface Station {
  readonly id: string;
  readonly label: string;
  readonly cap: string;
  readonly cam: {
    readonly theta: number;
    readonly phi: number;
    readonly dist: number;
    readonly target: readonly [number, number, number];
  };
  /** Fades the container shell so the modules inside it are visible. */
  readonly xray: boolean;
  readonly labels: readonly string[];
}

export const STATIONS: NonEmpty<Station> = [
  {
    id: 'mine',
    label: '01 · the mine',
    cap: 'A closed mine as the model sees it: strata, shaft, two gallery levels — and gas that never stopped moving.',
    cam: { theta: 0.65, phi: 0.42, dist: 74, target: [0, -8, -6] },
    xray: false,
    labels: ['shaft', 'gallery', 'sump'],
  },
  {
    id: 'seal',
    label: '02 · the seal',
    cap: "The wellhead: the mine's one controlled opening. Seal it, hold a slight vacuum, and the leak becomes a stream.",
    cam: { theta: 0.9, phi: 0.9, dist: 26, target: [-7, 1, -3] },
    xray: false,
    labels: ['wellhead', 'headframe', 'pipe'],
  },
  {
    id: 'inside',
    label: '03 · inside the AMAS',
    cap: 'The container, x-rayed: meter, dry, blow, route. Every module commercial; the integration is the invention.',
    cam: { theta: 0.14, phi: 0.68, dist: 22, target: [6, 0.5, -6] },
    xray: true,
    labels: ['meter', 'ko', 'blower', 'router', 'engine', 'flare', 'rto'],
  },
  {
    id: 'router',
    label: '04 · the router',
    cap: 'Three destinations, one decision, re-taken as the gas leans out. The lit module is today’s answer.',
    cam: { theta: 0.38, phi: 0.6, dist: 14, target: [8, 1.5, -6] },
    xray: true,
    labels: ['engine', 'flare', 'rto'],
  },
  {
    id: 'scenarios',
    label: '05 · scenarios',
    cap: 'Now run it: flood the mine, move the year, switch the unit off — and watch what reaches the sky.',
    cam: { theta: 0.35, phi: 0.55, dist: 66, target: [0, -6, -6] },
    xray: false,
    labels: ['stack', 'vent', 'water'],
  },
];

interface Part {
  readonly id: string;
  readonly name: string;
  readonly pos: THREE_NS.Vector3;
}

interface Particle {
  live: boolean;
  t: number;
  speed: number;
  /** Lateral jitter, so a stream of particles is not a single line. */
  j: number;
  mode: 'vent' | 'unit';
}

interface Camera {
  theta: number;
  phi: number;
  dist: number;
  target: THREE_NS.Vector3;
}

interface Scene {
  readonly THREE: THREE;
  readonly renderer: THREE_NS.WebGLRenderer;
  readonly scene: THREE_NS.Scene;
  readonly camera: THREE_NS.PerspectiveCamera;
  readonly parts: Part[];
  readonly labels: Record<string, HTMLElement>;
  readonly containerMaterial: THREE_NS.MeshLambertMaterial;
  readonly moduleMaterials: Record<string, THREE_NS.MeshLambertMaterial>;
  readonly stackTops: Record<string, THREE_NS.Vector3>;
  readonly water: THREE_NS.Mesh;
  readonly pipeCurve: THREE_NS.CatmullRomCurve3;
  readonly geometry: THREE_NS.BufferGeometry;
  readonly particles: Particle[];
  readonly particleCount: number;
  cam: Camera;
  goal: Camera;
  activeStack: THREE_NS.Vector3 | null;
  emitRate: number;
  needsFrame: boolean;
}

const state = { year: 2026, status: 'dry', seal: 'leaky', unitOn: true, station: 0 };

let view: Scene | null = null;
let loading = false;
let failed = false;
let running = false;

const wrapEl = (): HTMLElement => byId('xpWrap');

const fail = (error: unknown): void => {
  failed = true;
  wrapEl().innerHTML =
    '<p class="note" style="padding:22px;color:#A9C6D8">The 3-D model needs WebGL, which ' +
    'this browser declined. Sheets 1 and 2 above carry everything it shows.</p>';
  console.warn('[explorer]', error);
};

/* -------------------------------------------------------------------------- */
/* Scene construction                                                         */
/* -------------------------------------------------------------------------- */

const build = (THREE: THREE): Scene => {
  const wrap = wrapEl();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  wrap.insertBefore(renderer.domElement, wrap.firstChild);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 16 / 10, 0.5, 600);
  scene.add(new THREE.HemisphereLight(0xf4efe6, 0x2a1810, 0.95));
  const sun = new THREE.DirectionalLight(0xf4efe6, 0.65);
  sun.position.set(50, 70, 30);
  scene.add(sun);

  const parts: Part[] = [];
  const part = (id: string, name: string, x: number, y: number, z: number): void => {
    parts.push({ id, name, pos: new THREE.Vector3(x, y, z) });
  };

  const mat = (hex: number, opts?: { opacity?: number }): THREE_NS.MeshLambertMaterial => {
    const m = new THREE.MeshLambertMaterial({ color: hex });
    if (opts?.opacity !== undefined) {
      m.transparent = true;
      m.opacity = opts.opacity;
    }
    return m;
  };

  const box = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE_NS.Material,
  ): THREE_NS.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return mesh;
  };

  const edges = (mesh: THREE_NS.Mesh, opacity = 0.22): void => {
    const e = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({ color: 0xf2f8fc, transparent: true, opacity }),
    );
    e.position.copy(mesh.position);
    e.rotation.copy(mesh.rotation);
    scene.add(e);
  };

  // The specimen block: strata occupy the back half; the z = 0 face is the section cut,
  // with the workings drawn proud of it.
  for (const [top, bottom, colour] of [
    [0, -4, 0xd8b98c],
    [-4, -9, 0xc8973f],
    [-9, -15, 0xae6a2e],
    [-15, -21, 0x8c4220],
    [-21, -26, 0x3a2418],
  ] as const) {
    edges(box(60, top - bottom, 20, 0, (top + bottom) / 2, -10, mat(colour)), 0.12);
  }

  const dark = mat(0x17130e);
  edges(box(2.4, 24, 1.0, -8, -12, 0.25, dark), 0.3);
  box(24, 2.2, 1.0, 3, -14, 0.25, dark);
  box(27, 2.2, 1.0, 4.5, -21, 0.25, dark);
  // Goaf rubble at the gallery ends.
  for (let i = 0; i < 7; i++) {
    const r = box(1.4, 1.1, 0.9, 13 + (i % 3) * 1.5, -20.6 + (i % 2) * 0.9, 0.3, mat(0x2e2317));
    r.rotation.z = (i * 0.6) % 0.5;
  }
  box(4, 1.2, 0.9, -8, -23.4, 0.3, mat(0x3e6b7a, { opacity: 0.8 }));
  part('shaft', 'SHAFT', -8, -6, 1);
  part('gallery', 'GALLERIES · THE SEAM', 6, -14, 1);
  part('sump', 'SUMP', -8, -23, 1);

  const water = box(59.6, 1, 1.5, 0, -25.5, 0.18, mat(0x3e6b7a, { opacity: 0.5 }));
  water.visible = false;
  part('water', 'WATER — THE FLOODING QUESTION', -18, -18, 1);

  // Headframe over the shaft: four legs and a wheel.
  const legMat = mat(0x2e2317);
  const apex = new THREE.Vector3(-8, 8.8, -3);
  for (const [x, z] of [
    [-9.8, -1.4],
    [-6.2, -1.4],
    [-9.8, -4.6],
    [-6.2, -4.6],
  ] as const) {
    const base = new THREE.Vector3(x, 0, z);
    const dir = new THREE.Vector3().subVectors(apex, base);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, dir.length()), legMat);
    leg.position.copy(base).add(apex).multiplyScalar(0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    scene.add(leg);
  }
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.12, 8, 24), legMat);
  wheel.position.set(-8, 9.6, -3);
  scene.add(wheel);
  part('headframe', 'HEADFRAME — THE MINE THAT WAS', -8, 10.8, -3);

  edges(box(1.6, 1.6, 1.6, -8, 0.8, -3, mat(0x17130e)), 0.35);
  const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.4), mat(0x2e2317));
  vent.position.set(-8.9, 2.6, -3);
  scene.add(vent);
  part('wellhead', 'SEALED WELLHEAD · SLIGHT VACUUM', -8, 2.6, -1.6);
  part('vent', 'OPEN VENT — THE UNIT-OFF WORLD', -8.9, 4.6, -3);

  const pipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-7.2, 0.9, -3),
    new THREE.Vector3(-4.5, 1.1, -4.2),
    new THREE.Vector3(-1.5, 1.2, -5.4),
    new THREE.Vector3(0.1, 1.25, -6),
  ]);
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 24, 0.2, 10), mat(0xc9b693)));
  part('pipe', 'TIE-IN', -4.5, 2.1, -4.2);

  const containerMaterial = mat(0xc9b693);
  edges(box(12.2, 2.9, 2.6, 6.2, 1.45, -6, containerMaterial), 0.45);

  const moduleMaterials: Record<string, THREE_NS.MeshLambertMaterial> = {};
  for (const [id, name, x, colour, height] of [
    ['meter', 'METER', 1.2, 0xd7e7f2, 1.0],
    ['ko', 'KNOCKOUT', 2.6, 0x8fb8c7, 1.1],
    ['blower', 'BLOWER · EX', 4.0, 0x5c4b37, 1.0],
    ['router', 'ROUTER', 5.4, 0xe3d5b8, 1.35],
    ['engine', 'ENGINE · CHP', 7.4, 0x8c4220, 1.2],
    ['flare', 'FLARE', 9.2, 0x8c4220, 1.0],
    ['rto', 'RTO · LEAN', 11.0, 0x8c4220, 1.25],
  ] as const) {
    const m = mat(colour);
    box(1.15, height, 1.6, x + 0.1, 0.75 + height / 2, -6, m);
    moduleMaterials[id] = m;
    part(id, name, x + 0.1, 2.4, -5.2);
  }

  const stackTops: Record<string, THREE_NS.Vector3> = {};
  for (const [id, x] of [
    ['engine', 7.5],
    ['flare', 9.3],
    ['rto', 11.1],
  ] as const) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.8), mat(0x2e2317));
    stack.position.set(x, 3.8, -6);
    scene.add(stack);
    stackTops[id] = new THREE.Vector3(x, 4.8, -6);
  }
  part('stack', 'EXHAUST — CO₂, NOT CH₄', 9.3, 5.6, -6);

  // Particles.
  const particleCount = 240;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3),
  );
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3));

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 15);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.7, 'rgba(255,255,255,.85)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
  }
  scene.add(
    new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.75,
        vertexColors: true,
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    ),
  );

  const particles: Particle[] = Array.from({ length: particleCount }, () => ({
    live: false,
    t: 0,
    speed: 0,
    j: 0,
    mode: 'vent' as const,
  }));

  const home = (): Camera => ({
    theta: 0.65,
    phi: 0.42,
    dist: 74,
    target: new THREE.Vector3(0, -8, -6),
  });

  // Crisp HTML labels projected from 3-D, so the typography stays the site's own.
  const labelHost = byId('xpLabels');
  labelHost.innerHTML = '';
  const labels: Record<string, HTMLElement> = {};
  for (const p of parts) {
    const el = document.createElement('div');
    el.className = 'xp-label';
    el.textContent = p.name;
    el.style.display = 'none';
    labelHost.appendChild(el);
    labels[p.id] = el;
  }

  return {
    THREE,
    renderer,
    scene,
    camera,
    parts,
    labels,
    containerMaterial,
    moduleMaterials,
    stackTops,
    water,
    pipeCurve,
    geometry,
    particles,
    particleCount,
    cam: home(),
    goal: home(),
    activeStack: null,
    emitRate: 0,
    needsFrame: true,
  };
};

/* -------------------------------------------------------------------------- */
/* Scenario → scene. The same physics as the instruments above.               */
/* -------------------------------------------------------------------------- */

const currentStation = (): Station => STATIONS[state.station] ?? STATIONS[0];

const updateAria = (): void => {
  const st = currentStation();
  wrapEl().setAttribute(
    'aria-label',
    'Three-dimensional cutaway model of the specimen mine and abatement unit. Station ' +
      `${state.station + 1} of ${STATIONS.length}: ${st.cap} Scenario: ${state.status} mine, ` +
      `year ${state.year}, unit ` +
      (state.unitOn
        ? 'on — gas routes through the container to the lit module'
        : 'off — gas vents raw to the sky') +
      '. Drag or use arrow keys to orbit; plus and minus zoom.',
  );
};

const apply = (): void => {
  if (!view) return;
  const { THREE } = view;

  const specimen = amm.mines.find((m) => m.id === 'auguste-victoria');
  if (!specimen) return;
  const tw = mineTwin(specimen);

  const t = Math.max(0, state.year - tw.closed);
  const flooded = state.status === 'flooded';
  const frac = flooded ? floodedFactor(t, 'central') : dryFactor(t, 'central');
  view.emitRate = frac;

  // Water plane: sump → seal over the flooding cutoff.
  const progress = flooded ? Math.min(1, t / P('T_zero_fl')) : 0;
  view.water.visible = flooded && progress > 0.02;
  const top = -25 + progress * 23;
  view.water.scale.y = Math.max(0.06, top + 26);
  view.water.position.y = (-26 + top) / 2;

  // Module glow from the router: seal-driven purity, operating clock from 2026.
  const r = route(
    concentration(Math.max(0, state.year - 2026), state.seal === 'sealed' ? 'sealed' : 'leaky'),
  );
  const active =
    !state.unitOn || (flooded && frac <= 0)
      ? null
      : r.id === 'engine'
        ? 'engine'
        : r.id === 'margin' || r.id === 'rto'
          ? 'rto'
          : null;

  for (const [id, material] of Object.entries(view.moduleMaterials)) {
    material.emissive = new THREE.Color(id === active ? 0xb8391a : 0x000000);
    material.needsUpdate = true;
  }
  view.activeStack = active ? (view.stackTops[active] ?? null) : null;

  setText(
    byId('xpScenarioNote'),
    `year ${state.year} · modelled flow ≈${(tw.q0 * frac).toFixed(1)} MCM/yr ` +
      `(${state.status} · ${state.seal} seal) · ` +
      (state.unitOn
        ? active
          ? `routing to ${active === 'rto' ? 'the regenerative oxidizer' : `the ${active}`}`
          : 'below abatement floor'
        : 'unit off — venting raw') +
      ' · specimen: Auguste Victoria, modelled',
  );

  view.needsFrame = true;
  updateAria();
};

const goToStation = (i: number, instant: boolean): void => {
  state.station = i;
  const st = currentStation();
  if (!view) return;
  const { THREE } = view;

  view.goal = {
    theta: st.cam.theta,
    phi: st.cam.phi,
    dist: st.cam.dist,
    target: new THREE.Vector3(...st.cam.target),
  };
  if (instant || prefersReducedMotion()) {
    view.cam = { ...view.goal, target: view.goal.target.clone() };
  }

  view.containerMaterial.transparent = true;
  view.containerMaterial.opacity = st.xray ? 0.14 : 1;
  view.containerMaterial.needsUpdate = true;

  setText(byId('xpCap'), st.cap);
  document.querySelectorAll('#xpStations .uchip').forEach((b, j) => {
    b.setAttribute('aria-pressed', j === i ? 'true' : 'false');
  });

  view.needsFrame = true;
  updateAria();
};

/* -------------------------------------------------------------------------- */
/* Particles: methane climbs the shaft, then vents or is routed and destroyed  */
/* -------------------------------------------------------------------------- */

const spawn = (p: Particle): void => {
  p.live = true;
  p.t = prefersReducedMotion() ? Math.random() : 0;
  p.speed = 0.0035 + Math.random() * 0.003;
  p.j = Math.random() - 0.5;
  p.mode = state.unitOn && view?.activeStack ? 'unit' : 'vent';
};

const positionOf = (p: Particle, v: THREE_NS.Vector3): void => {
  if (!view) return;
  const t = p.t;

  if (p.mode === 'vent') {
    // Gallery → up the shaft → out the vent stub → sky drift.
    if (t < 0.55) {
      const k = t / 0.55;
      v.set(-8 + p.j * 1.2, -22 + k * 22, 0.4 + p.j * 0.3);
    } else {
      const k = (t - 0.55) / 0.45;
      v.set(-8.9 + p.j * 0.6 + k * (2 + p.j * 3), 1.5 + k * 14, -3 + p.j * 1.5);
    }
    return;
  }

  if (t < 0.4) {
    const k = t / 0.4;
    v.set(-8 + p.j * 1.0, -22 + k * 22.6, 0.3 + p.j * 0.2);
  } else if (t < 0.62) {
    view.pipeCurve.getPoint((t - 0.4) / 0.22, v);
    v.z += p.j * 0.1;
  } else if (t < 0.8) {
    const k = (t - 0.62) / 0.18;
    const sx = view.activeStack?.x ?? 9.3;
    v.set(0.4 + k * (sx - 0.4), 1.3 + k * 2.6, -6 + p.j * 0.3);
  } else {
    const k = (t - 0.8) / 0.2;
    const s = view.activeStack ?? new view.THREE.Vector3(9.3, 4.8, -6);
    v.set(s.x + p.j * k * 2, s.y + k * 9, s.z + p.j * k * 2);
  }
};

let scratch: THREE_NS.Vector3 | null = null;

const tickParticles = (): void => {
  if (!view) return;
  scratch ??= new view.THREE.Vector3();

  const position = view.geometry.attributes.position as THREE_NS.BufferAttribute;
  const colour = view.geometry.attributes.color as THREE_NS.BufferAttribute;
  const pos = position.array as Float32Array;
  const col = colour.array as Float32Array;

  const want = Math.round(view.particleCount * Math.max(0.02, Math.min(1, view.emitRate)));
  const reduced = prefersReducedMotion();
  let liveCount = 0;

  for (let i = 0; i < view.particleCount; i++) {
    const p = view.particles[i];
    if (!p) continue;

    if (!p.live) {
      if (liveCount < want && Math.random() < 0.05) spawn(p);
      else {
        pos[i * 3 + 1] = -999;
        continue;
      }
    }
    liveCount++;

    p.t += p.speed * (reduced ? 0 : 1);
    if (p.t >= 1) {
      p.live = false;
      pos[i * 3 + 1] = -999;
      continue;
    }

    positionOf(p, scratch);
    pos[i * 3] = scratch.x;
    pos[i * 3 + 1] = scratch.y;
    pos[i * 3 + 2] = scratch.z;

    // Warm while it is methane; grey-blue after the stack, where it has been destroyed.
    const burnt = p.mode === 'unit' && p.t > 0.8;
    col[i * 3] = burnt ? 0.56 : 0.97;
    col[i * 3 + 1] = burnt ? 0.73 : 0.62;
    col[i * 3 + 2] = burnt ? 0.79 : 0.42;
  }

  position.needsUpdate = true;
  colour.needsUpdate = true;
};

const projectLabels = (): void => {
  if (!view) return;
  const st = currentStation();
  const wrap = wrapEl();
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  scratch ??= new view.THREE.Vector3();

  for (const p of view.parts) {
    const el = view.labels[p.id];
    if (!el) continue;

    let show = st.labels.includes(p.id);
    if (show && p.id === 'water' && !view.water.visible) show = false;
    if (show && p.id === 'stack' && !state.unitOn) show = false;
    if (show && p.id === 'vent' && state.unitOn && state.station === 4) show = false;
    if (!show) {
      el.style.display = 'none';
      continue;
    }

    scratch.copy(p.pos).project(view.camera);
    if (scratch.z > 1) {
      el.style.display = 'none';
      continue;
    }
    el.style.display = 'block';
    el.style.left = `${(scratch.x * 0.5 + 0.5) * w}px`;
    el.style.top = `${(-scratch.y * 0.5 + 0.5) * h}px`;
  }
};

const loop = (): void => {
  if (!view || !running) return;
  requestAnimationFrame(loop);

  const reduced = prefersReducedMotion();
  const c = view.cam;
  const g = view.goal;
  const k = reduced ? 1 : 0.1;
  c.theta += (g.theta - c.theta) * k;
  c.phi += (g.phi - c.phi) * k;
  c.dist += (g.dist - c.dist) * k;
  c.target.lerp(g.target, k);
  const settled = Math.abs(g.theta - c.theta) < 1e-3 && Math.abs(g.dist - c.dist) < 0.05;

  if (!reduced) {
    tickParticles();
    view.needsFrame = true;
  } else if (view.needsFrame) {
    tickParticles();
  }

  if (!view.needsFrame) return;

  view.camera.position.set(
    c.target.x + c.dist * Math.sin(c.theta) * Math.cos(c.phi),
    c.target.y + c.dist * Math.sin(c.phi),
    c.target.z + c.dist * Math.cos(c.theta) * Math.cos(c.phi),
  );
  view.camera.lookAt(c.target);
  view.renderer.render(view.scene, view.camera);
  projectLabels();
  if (settled && reduced) view.needsFrame = false;
};

const resize = (): void => {
  if (!view) return;
  const wrap = wrapEl();
  const w = wrap.clientWidth;
  view.renderer.setSize(w, Math.round((w * 10) / 16), false);
  view.renderer.domElement.style.width = '100%';
  view.renderer.domElement.style.height = 'auto';
  view.camera.aspect = 16 / 10;
  view.camera.updateProjectionMatrix();
  view.needsFrame = true;
};

/** Orbit by drag, arrow keys or buttons — the wheel is deliberately not captured. */
const wireControls = (): void => {
  const wrap = wrapEl();
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  wrap.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    wrap.setPointerCapture(e.pointerId);
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!dragging || !view) return;
    view.goal.theta -= (e.clientX - lastX) * 0.006;
    view.goal.phi = Math.max(0.12, Math.min(1.35, view.goal.phi + (e.clientY - lastY) * 0.004));
    lastX = e.clientX;
    lastY = e.clientY;
    view.needsFrame = true;
  });
  wrap.addEventListener('pointerup', () => {
    dragging = false;
  });

  wrap.addEventListener('keydown', (e) => {
    if (!view) return;
    const g = view.goal;
    switch (e.key) {
      case 'ArrowLeft':
        g.theta += 0.12;
        break;
      case 'ArrowRight':
        g.theta -= 0.12;
        break;
      case 'ArrowUp':
        g.phi = Math.min(1.35, g.phi + 0.07);
        break;
      case 'ArrowDown':
        g.phi = Math.max(0.12, g.phi - 0.07);
        break;
      case '+':
      case '=':
        g.dist = Math.max(12, g.dist * 0.9);
        break;
      case '-':
        g.dist = Math.min(120, g.dist * 1.1);
        break;
      default:
        return;
    }
    e.preventDefault();
    view.needsFrame = true;
  });

  const zoom = (factor: number, floor: number, ceiling: number): void => {
    if (!view) return;
    view.goal.dist = Math.min(ceiling, Math.max(floor, view.goal.dist * factor));
    view.needsFrame = true;
  };
  byId('xpZoomIn').addEventListener('click', () => {
    zoom(0.82, 12, 120);
  });
  byId('xpZoomOut').addEventListener('click', () => {
    zoom(1.22, 12, 120);
  });
  byId('xpReset').addEventListener('click', () => {
    goToStation(state.station, false);
  });
  byId('xpPrev').addEventListener('click', () => {
    goToStation((state.station + STATIONS.length - 1) % STATIONS.length, false);
  });
  byId('xpNext').addEventListener('click', () => {
    goToStation((state.station + 1) % STATIONS.length, false);
  });

  document.querySelectorAll('#xpStations .uchip').forEach((b, i) => {
    b.addEventListener('click', () => {
      goToStation(i, false);
    });
  });
  for (const input of document.querySelectorAll<HTMLInputElement>('#xpFlood input')) {
    input.addEventListener('change', () => {
      state.status = input.value;
      apply();
    });
  }
  for (const input of document.querySelectorAll<HTMLInputElement>('#xpSeal input')) {
    input.addEventListener('change', () => {
      state.seal = input.value;
      apply();
    });
  }

  const unitBtn = byId('xpUnit');
  unitBtn.addEventListener('click', () => {
    state.unitOn = !state.unitOn;
    unitBtn.setAttribute('aria-pressed', state.unitOn ? 'true' : 'false');
    const label = unitBtn.querySelector('b');
    if (label) label.textContent = state.unitOn ? 'unit on' : 'unit off';
    apply();
  });

  const year = byId<HTMLInputElement>('xpYear');
  year.addEventListener('input', () => {
    state.year = Number(year.value);
    setText(byId('xpYearVal'), String(state.year));
    apply();
  });
};

/* -------------------------------------------------------------------------- */
/* Boot                                                                       */
/* -------------------------------------------------------------------------- */

const start = async (): Promise<void> => {
  loading = true;
  try {
    const THREE = await import('three');
    view = build(THREE);
    wireControls();
    resize();
    window.addEventListener('resize', resize);
    running = true;
    goToStation(0, true);
    apply();
    loop();
  } catch (error) {
    fail(error);
  } finally {
    loading = false;
  }
};

/**
 * The library is fetched only when the plate approaches, and the loop is suspended
 * whenever it leaves — a 3-D scene rendering off-screen is pure heat.
 */
export const bootExplorer = (): void => {
  const plate = document.getElementById('xpPlate');
  if (!plate || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) {
          running = false;
          continue;
        }
        if (view) {
          running = true;
          view.needsFrame = true;
          loop();
        } else if (!loading && !failed) {
          void start();
        }
      }
    },
    { rootMargin: '700px 0px', threshold: 0.02 },
  );
  observer.observe(plate);
};
