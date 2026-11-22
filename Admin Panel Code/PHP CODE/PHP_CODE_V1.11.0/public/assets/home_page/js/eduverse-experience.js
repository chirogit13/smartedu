/*!
 * Smart EduVerse homepage experience
 * Three.js (3D globe scene) + GSAP (intro, scroll) + Lenis (smooth scroll).
 * Everything is progressive: if a library, WebGL or JavaScript is unavailable,
 * the normal homepage keeps working.
 */
(() => {
    'use strict';

    const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
    const GSAP_URL = 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js';
    const ST_URL = 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js';
    const LENIS_URL = 'https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js';

    const hero = document.querySelector('section.heroSection#home');
    const tplCopy = document.getElementById('eduverseHeroCopy');
    const tplVisual = document.getElementById('eduverseHeroVisual');
    const tplStory = document.getElementById('eduverseStorySections');
    if (!hero || !tplCopy || !tplVisual || !tplStory) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const conn = navigator.connection || {};
    const lite = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 ||
        conn.saveData === true || window.innerWidth < 768;
    const firstVisit = (() => {
        try {
            const key = 'eduverse_intro_seen';
            const seen = sessionStorage.getItem(key);
            sessionStorage.setItem(key, '1');
            return !seen;
        } catch (e) {
            return true;
        }
    })();
    const introSpeed = firstVisit ? 1 : 2.6;
    const introStart = performance.now();
    const introT = () => reduceMotion ? 10 : ((performance.now() - introStart) / 1000) * introSpeed;

    /* ------------------------------------------------------------------ */
    /* 1. Mount the new content                                            */
    /* ------------------------------------------------------------------ */
    const copyTarget = hero.querySelector('.flex_column_start');
    if (copyTarget) copyTarget.replaceChildren(tplCopy.content.cloneNode(true));

    const imageWrap = hero.querySelector('.heroImg');
    if (imageWrap) {
        imageWrap.querySelectorAll('.topRated, .textWrapper').forEach((n) => n.remove());
        const screen = imageWrap.querySelector(':scope > img');
        if (screen) {
            screen.setAttribute('data-ev', 'screen');
            screen.classList.add('ev-screen');
            if (!screen.getAttribute('alt')) screen.setAttribute('alt', tplVisual.dataset.screenAlt || '');
        }
        imageWrap.appendChild(tplVisual.content.cloneNode(true));
    }

    const featureSection = document.getElementById('features');
    if (featureSection) featureSection.before(tplStory.content.cloneNode(true));
    else hero.after(tplStory.content.cloneNode(true));

    hero.classList.add('ev-hero');
    document.body.classList.add('eduverse-on');
    if (reduceMotion) document.body.classList.add('ev-reduced', 'ev-ready');

    const canvas = document.createElement('canvas');
    canvas.className = 'eduverse-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    hero.insertBefore(canvas, hero.firstChild);

    /* ------------------------------------------------------------------ */
    /* 2. AI assistant (speech bubble, reactions, eyes follow the mouse)   */
    /* ------------------------------------------------------------------ */
    const ai = hero.querySelector('.ev-ai');
    const bubble = ai ? ai.querySelector('[data-ev-bubble]') : null;
    let messages = [];
    try {
        messages = JSON.parse((ai && ai.dataset.msgs) || '[]');
    } catch (e) {
        messages = [];
    }
    let msgIndex = 0;
    let talkTimer = 0;
    let reactTimer = 0;

    function say(text, ms) {
        if (!ai || !bubble || !text) return;
        bubble.textContent = text;
        ai.classList.add('is-talking');
        clearTimeout(talkTimer);
        talkTimer = setTimeout(() => ai.classList.remove('is-talking'), ms || 4200);
    }

    function react(text) {
        if (!ai) return;
        ai.classList.remove('is-reacting');
        void ai.offsetWidth;
        ai.classList.add('is-reacting');
        clearTimeout(reactTimer);
        reactTimer = setTimeout(() => ai.classList.remove('is-reacting'), 700);
        if (text) say(text);
        scene3d.react();
    }

    hero.querySelectorAll('[data-ev-react]').forEach((el) => {
        const handler = () => react(el.dataset.evMsg || null);
        el.addEventListener('mouseenter', handler);
        el.addEventListener('focus', handler);
    });
    const avatarBtn = ai ? ai.querySelector('.ev-ai-avatar') : null;
    if (avatarBtn && messages.length) {
        avatarBtn.addEventListener('click', () => {
            msgIndex = (msgIndex + 1) % messages.length;
            react(messages[msgIndex]);
        });
    }

    // Pointer: eyes, card parallax, hero tilt
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const depthEls = Array.from(hero.querySelectorAll('[data-depth]'));
    if (finePointer && !reduceMotion) {
        hero.addEventListener('pointermove', (e) => {
            const r = hero.getBoundingClientRect();
            pointer.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
            pointer.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
            depthEls.forEach((el) => {
                const d = parseFloat(el.dataset.depth) || 0;
                el.style.translate = (pointer.tx * d).toFixed(1) + 'px ' + (pointer.ty * d).toFixed(1) + 'px';
            });
            if (avatarBtn) {
                const a = avatarBtn.getBoundingClientRect();
                const dx = e.clientX - (a.left + a.width / 2);
                const dy = e.clientY - (a.top + a.height / 3);
                const len = Math.max(1, Math.hypot(dx, dy));
                ai.style.setProperty('--ex', ((dx / len) * 4).toFixed(1) + 'px');
                ai.style.setProperty('--ey', ((dy / len) * 3).toFixed(1) + 'px');
            }
        });
        hero.addEventListener('pointerleave', () => {
            pointer.tx = 0;
            pointer.ty = 0;
            depthEls.forEach((el) => { el.style.translate = ''; });
            if (ai) {
                ai.style.setProperty('--ex', '0px');
                ai.style.setProperty('--ey', '0px');
            }
        });
    }

    /* ------------------------------------------------------------------ */
    /* 3. Intro timeline (GSAP) with CSS fallback                          */
    /* ------------------------------------------------------------------ */
    function finishIntro() {
        document.body.classList.add('ev-ready');
        if (messages[0]) setTimeout(() => say(messages[0], 5200), reduceMotion ? 600 : 300);
    }

    function runIntro(gsap) {
        const q = (s) => Array.from(hero.querySelectorAll(s));
        const all = q('[data-ev]');
        const tl = gsap.timeline({
            defaults: { ease: 'power3.out' },
            onComplete: () => {
                document.body.classList.add('ev-ready');
                gsap.set(all, { clearProps: 'transform,filter,opacity' });
                finishIntro();
            }
        });
        tl.fromTo(q('[data-ev="brand"]'), { opacity: 0, y: 14, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.9 }, 0.25)
            .fromTo(q('[data-ev="eyebrow"]'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 }, 0.7)
            .fromTo(q('[data-ev="line"]'), { opacity: 0, yPercent: 110 }, { opacity: 1, yPercent: 0, duration: 0.95, stagger: 0.2 }, 1.0)
            .fromTo(q('[data-ev="screen"]'), { opacity: 0 }, { opacity: 1, duration: 1.1 }, 1.6)
            .fromTo(q('[data-ev="sub"]'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7 }, 1.75)
            .fromTo(q('[data-ev="actions"]'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6 }, 2.1)
            .fromTo(q('[data-ev="card"]'), { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.6, stagger: 0.15 }, 2.2)
            .fromTo(q('[data-ev="aud"]'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.1 }, 2.4)
            .fromTo(q('[data-ev="ai"]'), { opacity: 0, y: 20, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9 }, 2.5);
        tl.timeScale(introSpeed);
    }

    function scrollEffects(gsap, ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
        const lines = hero.querySelector('.linesBg');
        if (lines) {
            gsap.to(lines, {
                yPercent: -6,
                ease: 'none',
                scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
            });
        }
        document.querySelectorAll('.ev-story .ev-mock').forEach((mock) => {
            gsap.fromTo(mock, { y: 30 }, {
                y: -30,
                ease: 'none',
                scrollTrigger: { trigger: mock, start: 'top bottom', end: 'bottom top', scrub: true }
            });
        });
    }

    /* ------------------------------------------------------------------ */
    /* 4. Smooth scrolling (Lenis) - desktop mouse users only              */
    /* ------------------------------------------------------------------ */
    function startLenis() {
        if (reduceMotion || lite || !finePointer || typeof window.Lenis !== 'function') return;
        document.querySelectorAll('.modal, .offcanvas, .dropdown-menu, .tabsWrapper, .pricing .listWrapper, .custom-select-dropdown')
            .forEach((el) => el.setAttribute('data-lenis-prevent', ''));
        let lenis;
        try {
            lenis = new window.Lenis({
                duration: 1.05,
                smoothWheel: true,
                prevent: (node) => {
                    if (!node || node.nodeType !== 1) return false;
                    const s = getComputedStyle(node);
                    return /(auto|scroll)/.test(s.overflowY) && node.scrollHeight > node.clientHeight + 2;
                }
            });
        } catch (e) {
            return;
        }
        if (window.gsap && window.ScrollTrigger) {
            lenis.on('scroll', window.ScrollTrigger.update);
            window.gsap.ticker.add((t) => lenis.raf(t * 1000));
            window.gsap.ticker.lagSmoothing(0);
        } else {
            const raf = (t) => {
                lenis.raf(t);
                requestAnimationFrame(raf);
            };
            requestAnimationFrame(raf);
        }
        ['show.bs.modal', 'show.bs.offcanvas'].forEach((ev) => document.addEventListener(ev, () => lenis.stop()));
        ['hidden.bs.modal', 'hidden.bs.offcanvas'].forEach((ev) => document.addEventListener(ev, () => lenis.start()));
        document.addEventListener('click', (e) => {
            const a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
            if (!a || a.hasAttribute('data-bs-toggle')) return;
            const id = a.getAttribute('href');
            if (!id || id.length < 2) return;
            let target = null;
            try {
                target = document.querySelector(id);
            } catch (err) {
                return;
            }
            if (!target) return;
            e.preventDefault();
            const nav = document.querySelector('header.navbar');
            lenis.scrollTo(target, { offset: -(((nav && nav.offsetHeight) || 0) + 10) });
            if (history.replaceState) history.replaceState(null, '', id);
        });
    }

    /* ------------------------------------------------------------------ */
    /* 5. Story sections: reveal + animated demos                          */
    /* ------------------------------------------------------------------ */
    function countUp(root) {
        root.querySelectorAll('[data-ev-count]').forEach((el) => {
            const end = parseFloat(el.dataset.evCount) || 0;
            if (reduceMotion) {
                el.textContent = String(end);
                return;
            }
            const t0 = performance.now();
            const dur = 1300;
            const frame = (t) => {
                const p = Math.min(1, (t - t0) / dur);
                el.textContent = String(Math.round(end * (1 - Math.pow(1 - p, 3))));
                if (p < 1) requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
        });
    }

    function typeText(el, done) {
        if (!el) {
            if (done) done();
            return;
        }
        const full = el.dataset.full || '';
        let i = 0;
        const step = () => {
            i += 2;
            el.textContent = full.slice(0, i);
            if (i < full.length) setTimeout(step, 22);
            else if (done) done();
        };
        step();
    }

    function finishDemo(el) {
        el.classList.add('is-in', 'is-answering', 'is-done');
        el.querySelectorAll('[data-ev-type]').forEach((t) => { t.textContent = t.dataset.full || t.textContent; });
        countUp(el);
    }

    function runDemo(el) {
        if (reduceMotion) {
            finishDemo(el);
            return;
        }
        el.classList.add('is-in');
        countUp(el);
        if (el.dataset.evDemo === 'ai') {
            setTimeout(() => el.classList.add('is-typing'), 900);
            setTimeout(() => {
                el.classList.remove('is-typing');
                el.classList.add('is-answering');
                typeText(el.querySelector('[data-ev-type]'), () => el.classList.add('is-done'));
            }, 2300);
        } else {
            setTimeout(() => el.classList.add('is-done'), 1600);
        }
    }

    function initStory() {
        const reveals = Array.from(document.querySelectorAll('.ev-story .ev-reveal'));
        const demos = Array.from(document.querySelectorAll('.ev-story [data-ev-demo]'));
        document.querySelectorAll('.ev-story [data-ev-type]').forEach((el) => {
            el.dataset.full = el.textContent.trim();
            if (!reduceMotion) el.textContent = '';
        });
        if (reduceMotion || !('IntersectionObserver' in window)) {
            reveals.forEach((r) => r.classList.add('is-visible'));
            demos.forEach(finishDemo);
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                io.unobserve(entry.target);
                if (entry.target.hasAttribute('data-ev-demo')) runDemo(entry.target);
                else entry.target.classList.add('is-visible');
            });
        }, { threshold: 0.3, rootMargin: '0px 0px -8% 0px' });
        reveals.forEach((r) => io.observe(r));
        demos.forEach((d) => io.observe(d));
    }

    /* ------------------------------------------------------------------ */
    /* 6. Three.js scene: education globe, trails, orbiting objects       */
    /* ------------------------------------------------------------------ */
    const scene3d = { react: () => {} };

    function webglAvailable() {
        try {
            const c = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
        } catch (e) {
            return false;
        }
    }

    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const ease = (v) => 1 - Math.pow(1 - clamp01(v), 3);

    function glyphTexture(THREE, text) {
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 128;
        const g = c.getContext('2d');
        const r = 22;
        g.beginPath();
        g.moveTo(8 + r, 8);
        g.lineTo(120 - r, 8);
        g.quadraticCurveTo(120, 8, 120, 8 + r);
        g.lineTo(120, 120 - r);
        g.quadraticCurveTo(120, 120, 120 - r, 120);
        g.lineTo(8 + r, 120);
        g.quadraticCurveTo(8, 120, 8, 120 - r);
        g.lineTo(8, 8 + r);
        g.quadraticCurveTo(8, 8, 8 + r, 8);
        g.closePath();
        g.fillStyle = 'rgba(8, 30, 80, 0.88)';
        g.fill();
        g.lineWidth = 4;
        g.strokeStyle = 'rgba(125, 233, 255, 0.9)';
        g.stroke();
        g.fillStyle = '#e8f6ff';
        g.font = 'bold 50px Lato, Arial, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(text, 64, 68);
        const tex = new THREE.CanvasTexture(c);
        if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    function buildScene(THREE) {
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !lite, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1 : 1.75));
        renderer.setClearColor(0x000000, 0);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        const CAM_Z = 16;
        camera.position.set(0, 0, CAM_Z);

        scene.add(new THREE.AmbientLight(0x9fc4ff, 0.6));
        const key = new THREE.DirectionalLight(0x9fe8ff, 1.3);
        key.position.set(-5, 6, 8);
        scene.add(key);
        const rim = new THREE.PointLight(0x1d6fff, 3, 40);
        rim.position.set(6, -3, 6);
        scene.add(rim);

        // Star field
        const starCount = lite ? 260 : 700;
        const starPos = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            starPos[i * 3] = (Math.random() - 0.5) * 44;
            starPos[i * 3 + 1] = (Math.random() - 0.5) * 28;
            starPos[i * 3 + 2] = -Math.random() * 18 - 2;
        }
        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
            color: 0x9fdcff, size: 0.05, transparent: true, opacity: 0.7,
            blending: THREE.AdditiveBlending, depthWrite: false
        }));
        scene.add(stars);

        // World group (globe + orbits) anchored to the hero image
        const world = new THREE.Group();
        scene.add(world);
        const globe = new THREE.Group();
        globe.rotation.z = 0.35;
        world.add(globe);
        const R = 2.6;

        globe.add(new THREE.Mesh(
            new THREE.SphereGeometry(R, 48, 32),
            new THREE.MeshPhongMaterial({ color: 0x0a2a6e, emissive: 0x061a4a, shininess: 30, transparent: true, opacity: 0.94 })
        ));
        globe.add(new THREE.LineSegments(
            new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(R * 1.012, lite ? 2 : 3)),
            new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false })
        ));

        // "Continents" made of glowing dots
        const dotCount = lite ? 900 : 1800;
        const dots = [];
        const surface = [];
        for (let i = 0; i < dotCount; i++) {
            const y = 1 - (i / (dotCount - 1)) * 2;
            const rad = Math.sqrt(1 - y * y);
            const th = Math.PI * (3 - Math.sqrt(5)) * i;
            const x = Math.cos(th) * rad;
            const z = Math.sin(th) * rad;
            const n = Math.sin(x * 3.1 + Math.cos(y * 2.3)) * Math.cos(z * 2.7 + Math.sin(x * 1.7)) + Math.sin(y * 4.2) * 0.25;
            if (n > 0.08) {
                dots.push(x * R * 1.02, y * R * 1.02, z * R * 1.02);
                surface.push(new THREE.Vector3(x, y, z));
            }
        }
        const dotGeo = new THREE.BufferGeometry();
        dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(dots, 3));
        globe.add(new THREE.Points(dotGeo, new THREE.PointsMaterial({ color: 0x7de9ff, size: 0.05, transparent: true, opacity: 0.95 })));

        // Atmosphere glow (fresnel)
        const atmoMat = new THREE.ShaderMaterial({
            uniforms: { uColor: { value: new THREE.Color(0x22d3ee) }, uOpacity: { value: 1 } },
            vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
            fragmentShader: 'uniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.4); gl_FragColor = vec4(uColor, f * uOpacity); }',
            transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
        });
        world.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.16, 48, 32), atmoMat));

        // Data arcs travelling across the globe
        const arcs = [];
        const arcCount = lite ? 0 : 6;
        for (let i = 0; i < arcCount && surface.length > 10; i++) {
            const a = surface[Math.floor(Math.random() * surface.length)].clone().multiplyScalar(R * 1.02);
            const b = surface[Math.floor(Math.random() * surface.length)].clone().multiplyScalar(R * 1.02);
            const mid = a.clone().add(b).normalize().multiplyScalar(R * 1.5);
            const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
            const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(48));
            const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
                color: 0x7de9ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false
            }));
            const spark = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
            globe.add(line);
            globe.add(spark);
            arcs.push({ curve, line, spark, offset: Math.random() * 1.6, speed: 0.3 + Math.random() * 0.2 });
        }

        // Orbits with comet-like light trails
        const orbits = [];
        [[3.8, 0.9, 0.2], [4.4, -0.55, 0.85], [5.0, 0.35, -0.7]].forEach(([r, rx, rz], i) => {
            const pivot = new THREE.Group();
            pivot.rotation.set(rx, 0, rz);
            pivot.add(new THREE.Mesh(
                new THREE.TorusGeometry(r, 0.012, 6, 160),
                new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
            ));
            const seg = 70;
            const pts = [];
            const cols = [];
            for (let s = 0; s <= seg; s++) {
                const ang = (s / seg) * 1.3;
                pts.push(Math.cos(ang) * r, 0, -Math.sin(ang) * r);
                const k = 1 - s / seg;
                cols.push(0.49 * k, 0.91 * k, 1.0 * k);
            }
            const tg = new THREE.BufferGeometry();
            tg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
            tg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
            const trail = new THREE.Line(tg, new THREE.LineBasicMaterial({
                vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
            }));
            const trailPivot = new THREE.Group();
            trailPivot.add(trail);
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), new THREE.MeshBasicMaterial({ color: 0xe8fbff }));
            head.position.set(r, 0, 0);
            trailPivot.add(head);
            pivot.add(trailPivot);
            world.add(pivot);
            orbits.push({ pivot, trailPivot, speed: 0.35 + i * 0.12, mats: [trail.material] });
        });

        // Orbiting education objects
        const blue = new THREE.MeshStandardMaterial({ color: 0x1d6fff, emissive: 0x0b3a9a, emissiveIntensity: 0.5, roughness: 0.35, metalness: 0.2 });
        const cyan = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0a7d93, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.2 });
        const white = new THREE.MeshStandardMaterial({ color: 0xf2f8ff, roughness: 0.6 });
        const navy = new THREE.MeshStandardMaterial({ color: 0x0b1b44, roughness: 0.5, metalness: 0.3 });

        const makeBook = (cover) => {
            const g = new THREE.Group();
            g.add(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.68, 0.13), cover));
            const pages = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.63, 0.1), white);
            pages.position.x = 0.04;
            g.add(pages);
            return g;
        };
        const makeCap = () => {
            const g = new THREE.Group();
            const board = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.05, 0.75), navy);
            board.rotation.y = Math.PI / 4;
            g.add(board);
            const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.22, 20), navy);
            crown.position.y = -0.13;
            g.add(crown);
            const tassel = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), cyan);
            tassel.position.set(0.3, -0.05, 0.3);
            g.add(tassel);
            return g;
        };
        const makeAtom = () => {
            const g = new THREE.Group();
            g.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 14), cyan));
            for (let k = 0; k < 3; k++) {
                const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.018, 8, 40), blue);
                ring.rotation.set(k * 1.05, k * 0.6, 0);
                g.add(ring);
            }
            return g;
        };
        const makeBulb = () => {
            const g = new THREE.Group();
            const glass = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18),
                new THREE.MeshStandardMaterial({ color: 0x9feeff, emissive: 0x22d3ee, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 }));
            g.add(glass);
            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 14), white);
            base.position.y = -0.27;
            g.add(base);
            return g;
        };

        const glyphs = lite ? ['A+', 'AI', '\u03c0'] : ['A+', 'AI', '\u03c0', '\u2211', '\u221ax', 'ABC'];
        const objects = [makeBook(blue), makeCap(), makeAtom(), makeBook(cyan), makeBulb()];
        if (lite) objects.splice(3, 1);
        glyphs.forEach((txt) => {
            const card = new THREE.Mesh(
                new THREE.PlaneGeometry(0.62, 0.62),
                new THREE.MeshBasicMaterial({ map: glyphTexture(THREE, txt), transparent: true, side: THREE.DoubleSide, depthWrite: false })
            );
            card.userData.billboard = true;
            objects.push(card);
        });
        const floaters = objects.map((obj, i) => {
            const pivot = new THREE.Group();
            pivot.rotation.set((Math.random() - 0.5) * 1.3, 0, (Math.random() - 0.5) * 0.9);
            const radius = 3.6 + (i % 3) * 0.7 + Math.random() * 0.4;
            obj.position.set(radius, 0, 0);
            pivot.add(obj);
            world.add(pivot);
            return {
                pivot, obj,
                phase: (i / objects.length) * Math.PI * 2,
                speed: 0.1 + Math.random() * 0.08,
                spin: 0.3 + Math.random() * 0.5,
                appearAt: 1.6 + i * 0.08
            };
        });

        // Layout: anchor the globe behind the hero image
        const startPos = new THREE.Vector3();
        const targetPos = new THREE.Vector3();
        let targetScale = 1;
        function layout() {
            const cr = hero.getBoundingClientRect();
            if (!cr.width || !cr.height) return;
            renderer.setSize(cr.width, cr.height, false);
            camera.aspect = cr.width / cr.height;
            camera.updateProjectionMatrix();
            const vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * CAM_Z;
            const vw = vh * camera.aspect;
            const wpp = vh / cr.height;
            const ir = (imageWrap || hero).getBoundingClientRect();
            const cx = ir.left + ir.width / 2 - cr.left;
            const cy = ir.top + ir.height / 2 - cr.top;
            targetPos.set((cx / cr.width - 0.5) * vw, -(cy / cr.height - 0.5) * vh, 0);
            const desktop = cr.width >= 992;
            const radiusPx = Math.min(ir.width * (desktop ? 0.42 : 0.4), desktop ? 300 : 190);
            targetScale = (radiusPx * wpp) / R;
            const cy0 = Math.min(cr.height / 2, window.innerHeight / 2);
            startPos.set(0, -(cy0 / cr.height - 0.5) * vh, 0);
            if (reduceMotion) render();
        }

        let reactUntil = 0;
        scene3d.react = () => { reactUntil = performance.now() + 900; };

        const clock = new THREE.Clock();
        let last = 0;
        function render() {
            const time = reduceMotion ? 4 : clock.getElapsedTime();
            const T = introT();
            pointer.x += (pointer.tx - pointer.x) * 0.05;
            pointer.y += (pointer.ty - pointer.y) * 0.05;

            const grow = ease(T / 1.0);
            const travel = ease((T - 1.0) / 1.4);
            const s = targetScale * (0.35 + 0.65 * grow);
            world.scale.setScalar(s);
            world.position.lerpVectors(startPos, targetPos, travel);
            world.position.x += pointer.x * 0.25;
            world.position.y -= pointer.y * 0.15;

            const excited = performance.now() < reactUntil ? 1 : 0;
            globe.rotation.y = time * (0.12 + excited * 0.25) + pointer.x * 0.35;
            globe.rotation.x = Math.sin(time * 0.3) * 0.1 + pointer.y * 0.2;
            atmoMat.uniforms.uOpacity.value = (0.85 + Math.sin(time * 1.4) * 0.12 + excited * 0.4) * grow;

            const trailAlpha = ease((T - 1.8) / 0.8);
            orbits.forEach((o) => {
                o.trailPivot.rotation.y = -time * o.speed;
                o.mats.forEach((m) => { m.opacity = trailAlpha; });
            });

            arcs.forEach((a) => {
                const p = ((time * a.speed + a.offset) % 1.6) / 1.2;
                const count = Math.floor(clamp01(p) * 49);
                a.line.geometry.setDrawRange(0, count);
                a.line.material.opacity = 0.85 * trailAlpha * (p > 1 ? Math.max(0, 1 - (p - 1) * 2.5) : 1);
                a.spark.visible = p <= 1 && trailAlpha > 0;
                if (a.spark.visible) a.spark.position.copy(a.curve.getPoint(clamp01(p)));
            });

            floaters.forEach((f) => {
                f.pivot.rotation.y = f.phase + time * f.speed;
                const sc = ease((T - f.appearAt) / 0.6);
                f.obj.scale.setScalar(Math.max(0.001, sc));
                if (f.obj.userData.billboard) {
                    f.obj.lookAt(camera.position);
                } else {
                    f.obj.rotation.x = time * f.spin * 0.6;
                    f.obj.rotation.y = time * f.spin;
                }
            });

            stars.position.x = -pointer.x * 0.4;
            stars.position.y = pointer.y * 0.25;
            stars.rotation.y = time * 0.004;
            camera.position.x = pointer.x * 0.5;
            camera.position.y = -pointer.y * 0.3;
            camera.lookAt(0, 0, 0);
            renderer.render(scene, camera);
        }

        let running = false;
        let visible = true;
        let rafId = 0;
        function loop(ts) {
            if (!running) return;
            rafId = requestAnimationFrame(loop);
            if (lite && ts - last < 33) return;
            last = ts;
            render();
        }
        function play() {
            if (running || reduceMotion) return;
            running = true;
            rafId = requestAnimationFrame(loop);
        }
        function pause() {
            running = false;
            cancelAnimationFrame(rafId);
        }

        layout();
        if ('ResizeObserver' in window) new ResizeObserver(layout).observe(hero);
        window.addEventListener('resize', layout);
        setTimeout(layout, 600);
        setTimeout(layout, 2000);

        if (reduceMotion) {
            render();
        } else {
            if ('IntersectionObserver' in window) {
                new IntersectionObserver((entries) => {
                    visible = entries[0].isIntersecting;
                    if (visible && !document.hidden) play();
                    else pause();
                }).observe(hero);
            }
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) pause();
                else if (visible) play();
            });
            play();
        }
        canvas.classList.add('is-ready');
    }

    async function initThree() {
        if (!webglAvailable()) {
            canvas.remove();
            hero.classList.add('ev-no3d');
            return;
        }
        let THREE;
        try {
            THREE = await import(THREE_URL);
        } catch (e) {
            canvas.remove();
            hero.classList.add('ev-no3d');
            return;
        }
        try {
            buildScene(THREE);
        } catch (e) {
            canvas.remove();
            hero.classList.add('ev-no3d');
        }
    }

    /* ------------------------------------------------------------------ */
    /* 7. Boot                                                            */
    /* ------------------------------------------------------------------ */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    initStory();

    if (reduceMotion) {
        finishIntro();
    } else {
        // Safety net: never leave the hero hidden if GSAP is slow or blocked
        const safety = setTimeout(() => document.body.classList.add('ev-ready'), 2500);
        loadScript(GSAP_URL)
            .then(() => {
                clearTimeout(safety);
                if (document.body.classList.contains('ev-ready')) finishIntro();
                else runIntro(window.gsap);
                return loadScript(ST_URL).then(() => scrollEffects(window.gsap, window.ScrollTrigger)).catch(() => {});
            })
            .catch(() => {
                clearTimeout(safety);
                finishIntro();
            })
            .then(() => (lite || !finePointer ? null : loadScript(LENIS_URL).then(startLenis).catch(() => {})));
    }

    // Lazy-load the 3D scene after the page has painted
    const start3d = () => initThree();
    if ('requestIdleCallback' in window) window.requestIdleCallback(start3d, { timeout: 900 });
    else setTimeout(start3d, 200);
})();
