/*!
 * Smart EduVerse 3D - shared scene runtime for the Laravel admin panel.
 * Loaded as an ES module. Three.js is imported lazily (self-hosted, no CDN)
 * only when a stage scrolls into view and WebGL is available.
 *
 * Markup contract (rendered by resources/views/eduverse3d/stage.blade.php):
 *   <section class="ev3d" data-ev3d="globe|campus|classroom" data-ev3d-three="URL">
 *     <div class="ev3d-stage">...</div>
 *     <nav class="ev3d-panel"> <a data-ev3d-node="id" href="...">...</a> </nav>
 *     <script type="application/json" class="ev3d-config">{...}</script>
 *   </section>
 * The HTML panel is the accessible, keyboard-usable equivalent of every
 * clickable 3D object. The 3D scene is progressive enhancement only.
 */
const PALETTE = {
  navy: 0x0a1430,
  deep: 0x050b1d,
  blue: 0x2f6bff,
  cyan: 0x22d3ee,
  ice: 0xbfe9ff,
  amber: 0xf5b041,
  red: 0xff5d6c,
  green: 0x34d399,
};
const KIND_COLOR = {
  primary: PALETTE.cyan,
  info: PALETTE.blue,
  warning: PALETTE.amber,
  danger: PALETTE.red,
  success: PALETTE.green,
};

const reducedMotionQuery =
  typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext('webgl2') || c.getContext('webgl'))
    );
  } catch (e) {
    return false;
  }
}

function lowEndDevice() {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  const saveData = navigator.connection && navigator.connection.saveData;
  return cores <= 4 || mem <= 4 || !!saveData;
}

let threePromise = null;
function loadThree(url) {
  if (!threePromise) {
    threePromise = import(url).catch((err) => {
      threePromise = null;
      throw err;
    });
  }
  return threePromise;
}

/* ---------- helpers ---------- */
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeLabel(THREE, text, sub, opts) {
  const o = Object.assign({ color: '#e6f3ff', subColor: '#8fd8ff', scale: 1 }, opts || {});
  const ratio = 2;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = '600 ' + 26 * ratio + 'px Inter, "Segoe UI", Roboto, Arial, sans-serif';
  const subFont = '500 ' + 20 * ratio + 'px Inter, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.font = font;
  const w1 = ctx.measureText(text).width;
  ctx.font = subFont;
  const w2 = sub ? ctx.measureText(sub).width : 0;
  const padX = 18 * ratio;
  const width = Math.ceil(Math.max(w1, w2) + padX * 2);
  const height = Math.ceil((sub ? 80 : 50) * ratio);
  canvas.width = width;
  canvas.height = height;
  // glass pill
  const r = 14 * ratio;
  ctx.fillStyle = 'rgba(8, 20, 48, 0.78)';
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.55)';
  ctx.lineWidth = 2 * ratio;
  ctx.beginPath();
  ctx.moveTo(r, 1);
  ctx.arcTo(width - 1, 1, width - 1, height - 1, r);
  ctx.arcTo(width - 1, height - 1, 1, height - 1, r);
  ctx.arcTo(1, height - 1, 1, 1, r);
  ctx.arcTo(1, 1, width - 1, 1, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = font;
  ctx.fillStyle = o.color;
  ctx.fillText(text, width / 2, sub ? 28 * ratio : height / 2);
  if (sub) {
    ctx.font = subFont;
    ctx.fillStyle = o.subColor;
    ctx.fillText(sub, width / 2, 58 * ratio);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  const s = 0.0042 * o.scale;
  sprite.scale.set(width * s, height * s, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function glowMaterial(THREE, color, opacity) {
  return new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function starfield(THREE, count, radius) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const r = radius * (0.7 + Math.random() * 0.3);
    const s = Math.sqrt(1 - u * u);
    pos[i * 3] = r * s * Math.cos(t);
    pos[i * 3 + 1] = r * u;
    pos[i * 3 + 2] = r * s * Math.sin(t);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: PALETTE.ice,
    size: 0.035,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

function nodeColor(node) {
  return KIND_COLOR[node.kind] || PALETTE.cyan;
}

function formatValue(node) {
  if (node.value === null || node.value === undefined || node.value === '') return '';
  return String(node.value);
}

/* ---------- scene builders ----------
 * Each builder returns { root, pickables: [Object3D with userData.node], tick(t, dt) } */

function buildGlobe(THREE, cfg, quality) {
  const root = new THREE.Group();
  const world = new THREE.Group();
  root.add(world);
  const R = 1.6;
  const seg = quality === 'low' ? 32 : 64;

  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(R, seg, seg),
    new THREE.MeshStandardMaterial({
      color: PALETTE.navy,
      emissive: 0x0b2a6b,
      emissiveIntensity: 0.55,
      roughness: 0.6,
      metalness: 0.2,
    })
  );
  world.add(globe);

  const grid = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.003, 36, 18),
    new THREE.MeshBasicMaterial({ color: PALETTE.cyan, wireframe: true, transparent: true, opacity: 0.12 })
  );
  world.add(grid);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.12, seg, seg),
    new THREE.MeshBasicMaterial({
      color: PALETTE.blue,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  root.add(atmosphere);

  // School markers: positions are ILLUSTRATIVE (schools have no coordinates).
  const markers = Array.isArray(cfg.markers) ? cfg.markers : [];
  const pickables = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const n = Math.max(markers.length, 1);
  markers.forEach((m, i) => {
    const jitter = (hashString(String(m.id || i)) % 1000) / 1000;
    const y = 1 - ((i + 0.5) / n) * 2 * 0.85;
    const radius = Math.sqrt(1 - y * y);
    const theta = golden * i + jitter * 0.6;
    const dir = new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius).normalize();
    const color = nodeColor(m);
    const height = 0.18 + Math.min(0.35, (m.weight || 1) * 0.05);
    const spike = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.03, height, 8),
      new THREE.MeshBasicMaterial({ color: color })
    );
    spike.position.copy(dir.clone().multiplyScalar(R + height / 2));
    spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), glowMaterial(THREE, color, 0.75));
    halo.position.copy(dir.clone().multiplyScalar(R + height));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.075, 24), glowMaterial(THREE, color, 0.5));
    ring.position.copy(dir.clone().multiplyScalar(R + 0.005));
    ring.lookAt(dir.clone().multiplyScalar(R * 3));
    const g = new THREE.Group();
    g.add(spike, halo, ring);
    g.userData.node = m;
    g.userData.highlight = halo;
    world.add(g);
    if (m.href) pickables.push(g);
  });

  // Module satellites orbit the globe.
  const nodes = Array.isArray(cfg.nodes) ? cfg.nodes : [];
  const orbit = new THREE.Group();
  orbit.rotation.x = 0.32;
  root.add(orbit);
  const orbitR = R * 1.75;
  const ringLine = new THREE.Mesh(
    new THREE.TorusGeometry(orbitR, 0.006, 8, 160),
    glowMaterial(THREE, PALETTE.cyan, 0.35)
  );
  ringLine.rotation.x = Math.PI / 2;
  orbit.add(ringLine);
  nodes.forEach((node, i) => {
    const a = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
    const color = nodeColor(node);
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR);
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.13, 0),
      new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.6, roughness: 0.3 })
    );
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), glowMaterial(THREE, color, 0.18));
    const label = makeLabel(THREE, node.label, formatValue(node), { scale: 0.85 });
    label.position.set(0, 0.36, 0);
    g.add(core, halo, label);
    g.userData.node = node;
    g.userData.highlight = halo;
    g.userData.spin = core;
    orbit.add(g);
    pickables.push(g);
  });

  root.add(starfield(THREE, quality === 'low' ? 300 : 900, 14));

  return {
    root: root,
    pickables: pickables,
    camera: { pos: [0, 0.9, 6.4], target: [0, 0, 0] },
    tick: function (t, dt) {
      world.rotation.y += dt * 0.08;
      orbit.rotation.y += dt * 0.05;
      orbit.children.forEach((c) => {
        if (c.userData.spin) c.userData.spin.rotation.y += dt * 0.8;
      });
    },
  };
}

function buildCampus(THREE, cfg, quality) {
  const root = new THREE.Group();
  const nodes = Array.isArray(cfg.nodes) ? cfg.nodes : [];
  const pickables = [];

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(6, 64),
    new THREE.MeshStandardMaterial({ color: PALETTE.navy, roughness: 0.9, metalness: 0.1 })
  );
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);
  const grid = new THREE.GridHelper(12, 24, PALETTE.cyan, PALETTE.blue);
  grid.material.transparent = true;
  grid.material.opacity = 0.16;
  grid.position.y = 0.002;
  root.add(grid);

  // Central plaza
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.05, 48), glowMaterial(THREE, PALETTE.cyan, 0.25));
  plaza.position.y = 0.03;
  root.add(plaza);
  const beacon = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 4), new THREE.MeshStandardMaterial({ color: PALETTE.cyan, emissive: PALETTE.cyan, emissiveIntensity: 0.7 }));
  beacon.position.y = 0.45;
  root.add(beacon);
  if (cfg.centerLabel) {
    const lbl = makeLabel(THREE, cfg.centerLabel, cfg.centerSub || '', { scale: 1 });
    lbl.position.set(0, 1.15, 0);
    root.add(lbl);
  }

  const values = nodes.map((n) => Number(n.metric) || 0);
  const maxV = Math.max(1, ...values);
  const rings = nodes.length > 8 ? [2.4, 4.0] : [3.0];
  let idx = 0;
  rings.forEach((radius, ri) => {
    const count = rings.length === 1 ? nodes.length : ri === 0 ? Math.min(6, nodes.length) : nodes.length - 6;
    for (let k = 0; k < count; k++, idx++) {
      const node = nodes[idx];
      const a = (k / count) * Math.PI * 2 + ri * 0.35;
      const color = nodeColor(node);
      const h = 0.45 + 1.1 * Math.sqrt((Number(node.metric) || 0) / maxV);
      const g = new THREE.Group();
      g.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, h, 0.75),
        new THREE.MeshStandardMaterial({
          color: 0x10224f,
          emissive: color,
          emissiveIntensity: 0.12,
          roughness: 0.35,
          metalness: 0.4,
          transparent: true,
          opacity: 0.92,
        })
      );
      body.position.y = h / 2;
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(body.geometry),
        new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.9 })
      );
      edges.position.copy(body.position);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.8), glowMaterial(THREE, color, 0.55));
      roof.position.y = h + 0.03;
      const pad = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.62, 32), glowMaterial(THREE, color, 0.35));
      pad.rotation.x = -Math.PI / 2;
      pad.position.y = 0.01;
      const label = makeLabel(THREE, node.label, formatValue(node), { scale: 0.8 });
      label.position.set(0, h + 0.42, 0);
      g.add(body, edges, roof, pad, label);
      g.lookAt(0, 0, 0);
      g.userData.node = node;
      g.userData.highlight = pad;
      g.userData.body = body;
      root.add(g);
      pickables.push(g);

      // path to the plaza
      const path = new THREE.Mesh(new THREE.PlaneGeometry(0.08, radius - 1.2), glowMaterial(THREE, PALETTE.blue, 0.25));
      path.rotation.x = -Math.PI / 2;
      path.rotation.z = -a + Math.PI / 2;
      path.position.set(Math.cos(a) * (radius / 2 + 0.45), 0.006, Math.sin(a) * (radius / 2 + 0.45));
      root.add(path);
    }
  });

  root.add(starfield(THREE, quality === 'low' ? 200 : 600, 16));

  return {
    root: root,
    pickables: pickables,
    camera: { pos: [0, 4.6, 7.6], target: [0, 0.4, 0] },
    tick: function (t, dt) {
      root.rotation.y += dt * 0.04;
      beacon.rotation.y += dt * 0.9;
    },
  };
}

function buildClassroom(THREE, cfg, quality) {
  const root = new THREE.Group();
  const pickables = [];
  const nodes = Array.isArray(cfg.nodes) ? cfg.nodes : [];
  const slots = Array.isArray(cfg.slots) ? cfg.slots : [];

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 7),
    new THREE.MeshStandardMaterial({ color: PALETTE.navy, roughness: 0.85 })
  );
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);
  const grid = new THREE.GridHelper(9, 18, PALETTE.cyan, PALETTE.blue);
  grid.material.transparent = true;
  grid.material.opacity = 0.12;
  grid.position.y = 0.002;
  root.add(grid);

  // Smart board with today's summary
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 1.9, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x0d1d45, emissive: PALETTE.blue, emissiveIntensity: 0.18, roughness: 0.3 })
  );
  board.position.set(0, 1.55, -3.0);
  root.add(board);
  const boardEdge = new THREE.LineSegments(
    new THREE.EdgesGeometry(board.geometry),
    new THREE.LineBasicMaterial({ color: PALETTE.cyan })
  );
  boardEdge.position.copy(board.position);
  root.add(boardEdge);
  if (cfg.boardTitle) {
    const t = makeLabel(THREE, cfg.boardTitle, cfg.boardSub || '', { scale: 1.25 });
    t.position.set(0, 2.15, -2.9);
    root.add(t);
  }

  // Timetable slots as floating holo-cards in front of the board
  const shown = slots.slice(0, 6);
  shown.forEach((slot, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const card = makeLabel(THREE, slot.label, slot.sub || '', { scale: 0.75 });
    card.position.set(-1.45 + col * 1.45, 1.55 - row * 0.55, -2.85);
    const g = new THREE.Group();
    g.add(card);
    g.userData.node = slot;
    g.userData.highlight = null;
    g.userData.sprite = card;
    root.add(g);
    if (slot.href) pickables.push(g);
  });

  // Desks
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x14306e, roughness: 0.5, metalness: 0.3 });
  const deskGeo = new THREE.BoxGeometry(0.9, 0.06, 0.5);
  const legGeo = new THREE.BoxGeometry(0.05, 0.45, 0.05);
  const rows = quality === 'low' ? 2 : 3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 4; c++) {
      const d = new THREE.Group();
      const top = new THREE.Mesh(deskGeo, deskMat);
      top.position.y = 0.48;
      d.add(top);
      [[-0.4, -0.2], [0.4, -0.2], [-0.4, 0.2], [0.4, 0.2]].forEach((p) => {
        const leg = new THREE.Mesh(legGeo, deskMat);
        leg.position.set(p[0], 0.225, p[1]);
        d.add(leg);
      });
      d.position.set(-1.8 + c * 1.2, 0, -1.1 + r * 1.0);
      root.add(d);
    }
  }

  // Teaching stations (modules) around the room
  const n = nodes.length;
  nodes.forEach((node, i) => {
    const a = Math.PI * (0.15 + (0.7 * i) / Math.max(n - 1, 1));
    const x = -Math.cos(a) * 3.6;
    const z = 2.0 - Math.sin(a) * 1.4;
    const color = nodeColor(node);
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.34, 0.6, 24),
      new THREE.MeshStandardMaterial({ color: 0x10224f, emissive: color, emissiveIntensity: 0.15, metalness: 0.4, roughness: 0.4 })
    );
    pedestal.position.y = 0.3;
    const orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.17, 1),
      new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.65, roughness: 0.25 })
    );
    orb.position.y = 0.85;
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.42, 32), glowMaterial(THREE, color, 0.35));
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.01;
    const label = makeLabel(THREE, node.label, formatValue(node), { scale: 0.75 });
    label.position.y = 1.35;
    g.add(pedestal, orb, halo, label);
    g.userData.node = node;
    g.userData.highlight = halo;
    g.userData.spin = orb;
    root.add(g);
    pickables.push(g);
  });

  return {
    root: root,
    pickables: pickables,
    camera: { pos: [0, 3.4, 5.6], target: [0, 1.0, -0.6] },
    tick: function (t, dt) {
      pickables.forEach((p, i) => {
        if (p.userData.spin) {
          p.userData.spin.rotation.y += dt * 0.7;
          p.userData.spin.position.y = 0.85 + Math.sin(t * 1.5 + i) * 0.05;
        }
      });
    },
  };
}

const BUILDERS = { globe: buildGlobe, campus: buildCampus, classroom: buildClassroom };

/* ---------- stage controller ---------- */
class Stage {
  constructor(el) {
    this.el = el;
    this.type = el.getAttribute('data-ev3d');
    this.threeUrl = el.getAttribute('data-ev3d-three');
    this.host = el.querySelector('.ev3d-canvas');
    this.loading = el.querySelector('.ev3d-loading');
    this.fallback = el.querySelector('.ev3d-fallback');
    this.fallbackText = el.querySelector('.ev3d-fallback-text');
    this.tooltip = el.querySelector('.ev3d-tooltip');
    this.motionBtn = el.querySelector('.ev3d-motion-toggle');
    this.panelLinks = Array.from(el.querySelectorAll('[data-ev3d-node]'));
    try {
      const raw = el.querySelector('.ev3d-config');
      this.cfg = raw ? JSON.parse(raw.textContent || '{}') : {};
    } catch (e) {
      this.cfg = {};
    }
    this.i18n = this.cfg.i18n || {};
    this.visible = false;
    this.started = false;
    this.disposed = false;
    this.userPaused = false;
    this.reducedMotion = !!(reducedMotionQuery && reducedMotionQuery.matches);
    this.quality = lowEndDevice() ? 'low' : 'high';
    this.frameTimes = [];
    this.needsRender = true;
    this.hovered = null;
  }

  setState(state, message) {
    this.el.setAttribute('data-ev3d-state', state);
    if (this.loading) this.loading.hidden = state !== 'loading';
    if (this.fallback) this.fallback.hidden = state !== 'fallback';
    if (message && this.fallbackText) this.fallbackText.textContent = message;
  }

  init() {
    if (!BUILDERS[this.type]) {
      this.setState('fallback', this.i18n.unsupported);
      return;
    }
    if (!hasWebGL()) {
      this.setState('fallback', this.i18n.noWebgl);
      return;
    }
    this.updateMotionButton();
    if (this.motionBtn) {
      this.motionBtn.addEventListener('click', () => {
        this.userPaused = !this.userPaused;
        this.updateMotionButton();
        this.kick();
      });
    }
    if (reducedMotionQuery && reducedMotionQuery.addEventListener) {
      reducedMotionQuery.addEventListener('change', (e) => {
        this.reducedMotion = e.matches;
        this.updateMotionButton();
        this.kick();
      });
    }
    if ('IntersectionObserver' in window) {
      this.io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            this.visible = entry.isIntersecting;
            if (this.visible && !this.started) this.start();
            if (this.visible) this.kick();
          });
        },
        { rootMargin: '120px' }
      );
      this.io.observe(this.el);
    } else {
      this.visible = true;
      this.start();
    }
    document.addEventListener('visibilitychange', () => this.kick());
  }

  updateMotionButton() {
    if (!this.motionBtn) return;
    const animating = !this.userPaused && !this.reducedMotion;
    this.motionBtn.setAttribute('aria-pressed', animating ? 'false' : 'true');
    this.motionBtn.textContent = animating ? this.i18n.pause || 'Pause motion' : this.i18n.play || 'Play motion';
    this.motionBtn.disabled = this.reducedMotion;
    if (this.reducedMotion) this.motionBtn.title = this.i18n.reducedMotion || '';
  }

  animating() {
    return !this.userPaused && !this.reducedMotion;
  }

  async start() {
    this.started = true;
    this.setState('loading');
    let THREE;
    try {
      THREE = await loadThree(this.threeUrl);
    } catch (err) {
      console.error('[EduVerse3D] Could not load Three.js', err);
      this.setState('fallback', this.i18n.loadError);
      return;
    }
    try {
      this.build(THREE);
      this.setState('ready');
    } catch (err) {
      console.error('[EduVerse3D] Scene error', err);
      this.dispose();
      this.setState('fallback', this.i18n.sceneError);
    }
  }

  build(THREE) {
    this.THREE = THREE;
    const w = this.host.clientWidth || 600;
    const h = this.host.clientHeight || 400;
    const renderer = new THREE.WebGLRenderer({
      antialias: this.quality === 'high',
      alpha: true,
      powerPreference: this.quality === 'high' ? 'high-performance' : 'low-power',
    });
    this.maxRatio = this.quality === 'high' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    this.ratio = this.maxRatio;
    renderer.setPixelRatio(this.ratio);
    renderer.setSize(w, h, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.className = 'ev3d-gl';
    this.host.appendChild(renderer.domElement);
    renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.dispose();
      this.setState('fallback', this.i18n.contextLost);
    });
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(PALETTE.deep, 0.045);
    scene.add(new THREE.AmbientLight(0x6f8cff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(4, 6, 5);
    scene.add(key);
    const rim = new THREE.PointLight(PALETTE.cyan, 1.4, 30);
    rim.position.set(-5, 2, -4);
    scene.add(rim);
    this.scene = scene;

    const built = BUILDERS[this.type](THREE, this.cfg, this.quality);
    this.built = built;
    this.pivot = new THREE.Group();
    this.pivot.add(built.root);
    scene.add(this.pivot);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(built.camera.pos[0], built.camera.pos[1], built.camera.pos[2]);
    this.target = new THREE.Vector3(built.camera.target[0], built.camera.target[1], built.camera.target[2]);
    camera.lookAt(this.target);
    this.camera = camera;

    this.raycaster = new THREE.Raycaster();
    // Default line threshold (1 world unit) makes building outlines steal clicks.
    this.raycaster.params.Line.threshold = 0.01;
    this.raycaster.params.Points.threshold = 0.01;
    this.pointer = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.bindPointer();
    this.bindPanel();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.host);
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  resize() {
    if (!this.renderer) return;
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.kick();
  }

  kick() {
    this.needsRender = true;
    if (this.renderer && !this.raf && !this.disposed) {
      this.clock.getDelta();
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  loop() {
    this.raf = 0;
    if (this.disposed) return;
    const active = this.visible && document.visibilityState !== 'hidden';
    if (!active) return; // resumes via kick() from observers
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const t = this.clock.elapsedTime;
    const animate = this.animating();
    if (animate && this.built.tick) this.built.tick(t, dt);
    if (animate || this.needsRender || this.dragging) {
      const start = performance.now();
      this.renderer.render(this.scene, this.camera);
      this.needsRender = false;
      if (animate) this.adaptQuality(performance.now() - start, dt);
    }
    if (animate || this.dragging) this.raf = requestAnimationFrame(this.loop);
  }

  // Adaptive pixel ratio: drop resolution if frames are consistently slow.
  adaptQuality(cost, dt) {
    this.frameTimes.push(dt * 1000);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    if (avg > 26 && this.ratio > 0.75) {
      this.ratio = Math.max(0.75, this.ratio - 0.25);
      this.renderer.setPixelRatio(this.ratio);
      this.resize();
    } else if (avg < 14 && this.ratio < this.maxRatio) {
      this.ratio = Math.min(this.maxRatio, this.ratio + 0.25);
      this.renderer.setPixelRatio(this.ratio);
      this.resize();
    }
  }

  pick(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.built.pickables, true);
    for (let i = 0; i < hits.length; i++) {
      let o = hits[i].object;
      while (o && !(o.userData && o.userData.node)) o = o.parent;
      if (o) return o;
    }
    return null;
  }

  setHover(obj, clientX, clientY) {
    if (this.hovered === obj) {
      if (obj) this.placeTooltip(clientX, clientY);
      return;
    }
    if (this.hovered) this.highlight(this.hovered, false);
    this.hovered = obj;
    const dom = this.renderer.domElement;
    if (obj) {
      this.highlight(obj, true);
      dom.style.cursor = obj.userData.node.href ? 'pointer' : 'default';
      const node = obj.userData.node;
      if (this.tooltip) {
        const v = formatValue(node);
        this.tooltip.textContent = node.label + (v ? ' - ' + v : '') + (node.hint ? ' | ' + node.hint : '');
        this.tooltip.hidden = false;
        this.placeTooltip(clientX, clientY);
      }
    } else {
      dom.style.cursor = 'grab';
      if (this.tooltip) this.tooltip.hidden = true;
    }
    this.kick();
  }

  placeTooltip(clientX, clientY) {
    if (!this.tooltip || clientX === undefined) return;
    const rect = this.host.getBoundingClientRect();
    this.tooltip.style.left = Math.min(rect.width - 10, Math.max(10, clientX - rect.left)) + 'px';
    this.tooltip.style.top = Math.max(10, clientY - rect.top - 14) + 'px';
  }

  highlight(obj, on) {
    const id = obj.userData.node.id;
    const hl = obj.userData.highlight;
    if (hl && hl.material) {
      if (hl.userData.baseOpacity === undefined) hl.userData.baseOpacity = hl.material.opacity;
      hl.material.opacity = on ? Math.min(1, hl.userData.baseOpacity * 2.4) : hl.userData.baseOpacity;
    }
    obj.scale.setScalar(on ? 1.12 : 1);
    this.panelLinks.forEach((a) => {
      if (a.getAttribute('data-ev3d-node') === String(id)) a.classList.toggle('is-linked', on);
    });
  }

  bindPointer() {
    const dom = this.renderer.domElement;
    dom.style.cursor = 'grab';
    dom.style.touchAction = 'pan-y';
    let downX = 0;
    let downY = 0;
    let lastX = 0;
    let lastY = 0;
    let moved = false;
    const onDown = (e) => {
      this.dragging = true;
      moved = false;
      downX = lastX = e.clientX;
      downY = lastY = e.clientY;
      dom.style.cursor = 'grabbing';
      this.kick();
    };
    const onMove = (e) => {
      if (this.dragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) moved = true;
        if (moved) {
          this.pivot.rotation.y += dx * 0.006;
          this.pivot.rotation.x = Math.max(-0.5, Math.min(0.5, this.pivot.rotation.x + dy * 0.004));
          this.kick();
        }
        return;
      }
      if (e.pointerType === 'mouse') this.setHover(this.pick(e.clientX, e.clientY), e.clientX, e.clientY);
    };
    const onUp = (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      dom.style.cursor = 'grab';
      if (!moved) {
        const obj = this.pick(e.clientX, e.clientY);
        if (obj && obj.userData.node.href) {
          window.location.href = obj.userData.node.href;
          return;
        }
        if (e.pointerType !== 'mouse') this.setHover(obj, e.clientX, e.clientY);
      }
      this.kick();
    };
    dom.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    dom.addEventListener('pointerleave', () => {
      if (!this.dragging) this.setHover(null);
    });
    this.cleanupPointer = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }

  // Focus/hover on the accessible panel highlights the matching 3D object.
  bindPanel() {
    const byId = new Map();
    this.built.pickables.forEach((p) => byId.set(String(p.userData.node.id), p));
    this.panelLinks.forEach((a) => {
      const obj = byId.get(a.getAttribute('data-ev3d-node'));
      if (!obj) return;
      const on = () => {
        this.highlight(obj, true);
        this.kick();
      };
      const off = () => {
        this.highlight(obj, false);
        this.kick();
      };
      a.addEventListener('focus', on);
      a.addEventListener('blur', off);
      a.addEventListener('mouseenter', on);
      a.addEventListener('mouseleave', off);
    });
  }

  dispose() {
    this.disposed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.io) this.io.disconnect();
    if (this.ro) this.ro.disconnect();
    if (this.cleanupPointer) this.cleanupPointer();
    if (this.scene) {
      this.scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer = null;
  }
}

function boot() {
  const stages = Array.from(document.querySelectorAll('[data-ev3d]')).map((el) => {
    const s = new Stage(el);
    s.init();
    return s;
  });
  window.addEventListener('pagehide', () => stages.forEach((s) => s.dispose()));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
