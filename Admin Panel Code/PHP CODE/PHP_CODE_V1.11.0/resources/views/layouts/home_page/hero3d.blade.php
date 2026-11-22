{{--
    Animated 3D hero background for the landing page (Three.js).
    Purely decorative: it only activates when the homepage hero (section#home.heroSection)
    exists, never blocks clicks, and silently falls back to the normal hero when WebGL
    or the CDN is unavailable. Respects prefers-reduced-motion.
--}}
<style>
    .hero3d {
        position: relative;
        overflow: hidden;
    }

.hero3d-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
    opacity: 0;
    transition: opacity .8s ease-out;
}

.hero3d-canvas.is-ready {
    opacity: 1;
}

/* keep the hero content above the canvas (modal is left untouched) */
.hero3d>.linesBg {
    position: relative;
    z-index: 1;
}

.hero3d .heroImg {
    transition: transform .25s ease-out;
    will-change: transform;
}

.hero3d .heroImg>img {
    filter: drop-shadow(0 25px 35px rgba(0, 0, 0, .18));
}

@media (prefers-reduced-motion: reduce) {
    .hero3d-canvas {
        transition: none;
    }

    .hero3d .heroImg {
        transition: none;
        transform: none !important;
    }
}

</style>

<script type="module">
    const hero = document.querySelector('section.heroSection#home');

function webglAvailable() {
    try {
        const c = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) {
        return false;
    }
}

async function initHero3D() {
    if (!hero || !webglAvailable()) return;

    let THREE;
    try {
        THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
    } catch (e) {
        return; // CDN blocked or offline: keep the normal hero
    }

    const canvas = document.createElement('canvas');
    canvas.className = 'hero3d-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    hero.classList.add('hero3d');
    hero.insertBefore(canvas, hero.firstChild);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSmall = window.innerWidth < 768;
    const css = getComputedStyle(document.documentElement);
    const readColor = (name, fallback) => {
        const v = (css.getPropertyValue(name) || '').trim();
        try {
            return new THREE.Color(v || fallback);
        } catch (e) {
            return new THREE.Color(fallback);
        }
    };
    const primary = readColor('--primary-color', '#56cc99');
    const secondary = readColor('--secondary-color', '#215679');
    const accent = readColor('--secondary-color1', '#38a3a5');

    // ---- renderer / scene / camera
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !isSmall,
        alpha: true,
        powerPreference: 'low-power'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 14);

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(5, 6, 8);
    scene.add(key);
    const rim = new THREE.PointLight(primary, 2.2, 40);
    rim.position.set(-6, -3, 6);
    scene.add(rim);

    const world = new THREE.Group();
    scene.add(world);

    // ---- "Knowledge globe": wireframe icosphere + glowing nodes + inner core
    const globe = new THREE.Group();
    world.add(globe);

    const ico = new THREE.IcosahedronGeometry(3, 2);
    const wire = new THREE.LineSegments(
        new THREE.WireframeGeometry(ico),
        new THREE.LineBasicMaterial({ color: secondary, transparent: true, opacity: 0.28 })
    );
    globe.add(wire);

    const nodes = new THREE.Points(
        ico,
        new THREE.PointsMaterial({ color: primary, size: 0.12, transparent: true, opacity: 0.95 })
    );
    globe.add(nodes);

    const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.55, 1),
        new THREE.MeshStandardMaterial({
            color: primary,
            roughness: 0.35,
            metalness: 0.25,
            flatShading: true,
            transparent: true,
            opacity: 0.9
        })
    );
    globe.add(core);

    // ---- orbit rings with small satellites
    const rings = [];
    [
        [4.1, 0.9, 0.2, accent],
        [4.8, -0.5, 0.9, primary],
        [5.5, 0.3, -0.7, secondary]
    ].forEach(([r, rx, rz, col], i) => {
        const g = new THREE.Group();
        g.rotation.set(rx, 0, rz);
        g.add(new THREE.Mesh(
            new THREE.TorusGeometry(r, 0.018, 8, 160),
            new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.45 })
        ));
        const sat = new THREE.Mesh(
            new THREE.SphereGeometry(0.16 + i * 0.03, 16, 16),
            new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.4 })
        );
        sat.position.x = r;
        g.add(sat);
        g.userData.speed = 0.25 + i * 0.12;
        world.add(g);
        rings.push(g);
    });

    // ---- floating shapes (books / crystals / rings)
    const floaters = [];
    const shapeGeos = [
        new THREE.BoxGeometry(0.7, 0.9, 0.18),
        new THREE.OctahedronGeometry(0.45),
        new THREE.TetrahedronGeometry(0.5),
        new THREE.TorusGeometry(0.35, 0.12, 12, 32)
    ];
    const palette = [primary, secondary, accent];
    const floaterCount = isSmall ? 6 : 12;
    for (let i = 0; i < floaterCount; i++) {
        const m = new THREE.Mesh(
            shapeGeos[i % shapeGeos.length],
            new THREE.MeshStandardMaterial({
                color: palette[i % palette.length],
                roughness: 0.4,
                metalness: 0.2,
                flatShading: true,
                transparent: true,
                opacity: 0.85
            })
        );
        const a = (i / floaterCount) * Math.PI * 2;
        const radius = 7 + Math.random() * 4;
        m.position.set(Math.cos(a) * radius, (Math.random() - 0.5) * 7, -2 - Math.random() * 6);
        m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
        m.userData = { baseY: m.position.y, phase: Math.random() * Math.PI * 2, spin: 0.2 + Math.random() * 0.5 };
        scene.add(m);
        floaters.push(m);
    }

    // ---- starfield
    const pCount = isSmall ? 350 : 900;
    const pos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 40;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 24;
        pos[i * 3 + 2] = -Math.random() * 20;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
        color: accent, size: 0.06, transparent: true, opacity: 0.6
    }));
    scene.add(particles);

    // ---- layout / resize
    function layout() {
        const w = hero.clientWidth;
        const h = hero.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        const desktop = w >= 992;
        const rtl = document.documentElement.dir === 'rtl';
        world.position.set(desktop ? (rtl ? -4.2 : 4.2) : 0, desktop ? 0 : 1.5, 0);
        const s = desktop ? 1 : 0.7;
        world.scale.set(s, s, s);
        core.material.opacity = desktop ? 0.9 : 0.45;
        wire.material.opacity = desktop ? 0.28 : 0.15;
        if (reduceMotion) renderFrame(0.6);
    }

    // ---- mouse parallax + subtle 3D tilt on hero image
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const heroImg = hero.querySelector('.heroImg');
    if (!reduceMotion) {
        hero.addEventListener('pointermove', (e) => {
            const r = hero.getBoundingClientRect();
            mouse.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
            mouse.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
            if (heroImg && window.innerWidth >= 992) {
                heroImg.style.transform =
                    `perspective(1000px) rotateY(${mouse.tx * 6}deg) rotateX(${-mouse.ty * 6}deg)`;
            }
        });
        hero.addEventListener('pointerleave', () => {
            mouse.tx = 0;
            mouse.ty = 0;
            if (heroImg) heroImg.style.transform = '';
        });
    }

    // ---- animation loop (paused when off-screen or tab hidden)
    const clock = new THREE.Clock();
    let running = false;
    let visible = true;

    function renderFrame(t) {
        mouse.x += (mouse.tx - mouse.x) * 0.05;
        mouse.y += (mouse.ty - mouse.y) * 0.05;

        globe.rotation.y = t * 0.15 + mouse.x * 0.4;
        globe.rotation.x = Math.sin(t * 0.3) * 0.15 + mouse.y * 0.3;
        core.rotation.y = -t * 0.4;
        core.rotation.z = t * 0.2;
        const pulse = 1 + Math.sin(t * 1.6) * 0.04;
        core.scale.set(pulse, pulse, pulse);

        rings.forEach((g) => (g.rotation.y = t * g.userData.speed));

        floaters.forEach((m) => {
            m.position.y = m.userData.baseY + Math.sin(t * 0.8 + m.userData.phase) * 0.5;
            m.rotation.x += 0.004 * m.userData.spin;
            m.rotation.y += 0.006 * m.userData.spin;
        });

        particles.rotation.y = t * 0.01;

        camera.position.x = mouse.x * 0.8;
        camera.position.y = -mouse.y * 0.5;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
    }

    function loop() {
        if (!running) return;
        renderFrame(clock.getElapsedTime());
        requestAnimationFrame(loop);
    }

    function start() {
        if (running || reduceMotion) return;
        running = true;
        loop();
    }

    function stop() {
        running = false;
    }

    layout();
    if ('ResizeObserver' in window) {
        new ResizeObserver(layout).observe(hero);
    } else {
        window.addEventListener('resize', layout);
    }

    if (!reduceMotion) {
        if ('IntersectionObserver' in window) {
            new IntersectionObserver((entries) => {
                visible = entries[0].isIntersecting;
                visible && !document.hidden ? start() : stop();
            }).observe(hero);
        }
        document.addEventListener('visibilitychange', () => {
            document.hidden ? stop() : (visible && start());
        });
        start();
    }

    canvas.classList.add('is-ready');
}

initHero3D().catch(() => {
    const c = document.querySelector('.hero3d-canvas');
    if (c) c.remove();
    if (hero) hero.classList.remove('hero3d');
});

</script>