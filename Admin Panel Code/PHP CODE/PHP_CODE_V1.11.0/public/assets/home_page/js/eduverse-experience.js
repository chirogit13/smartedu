(() => {
    'use strict';

    const hero = document.querySelector('section.heroSection#home');
    const featureSection = document.querySelector('#features');
    const heroTemplate = document.getElementById('eduverseHeroCopy');
    const storyTemplate = document.getElementById('eduverseStorySections');
    if (!hero || !featureSection || !heroTemplate || !storyTemplate) return;

    const copyTarget = hero.querySelector('.flex_column_start');
    if (copyTarget) copyTarget.replaceChildren(heroTemplate.content.cloneNode(true));

    const imageTarget = hero.querySelector('.heroImg');
    const assistantTemplate = document.getElementById('eduverseAssistantBadge');
    if (imageTarget && assistantTemplate) {
        imageTarget.querySelectorAll('.topRated, .textWrapper').forEach((item) => item.remove());
        imageTarget.append(assistantTemplate.content.cloneNode(true));
    }

    featureSection.before(storyTemplate.content.cloneNode(true));
    document.body.classList.add('eduverse-on');

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const heroCanvas = document.createElement('canvas');
    heroCanvas.className = 'eduverse-canvas';
    heroCanvas.setAttribute('aria-hidden', 'true');
    hero.insertBefore(heroCanvas, hero.firstChild);

    let gsap = null;
    let ScrollTrigger = null;
    let Lenis = null;
    let lenis = null;

    function revealSections() {
        const revealItems = document.querySelectorAll('.eduverse-reveal');
        if (reduceMotion) {
            revealItems.forEach((item) => item.classList.add('is-visible'));
            return;
        }
        if (gsap && ScrollTrigger) {
            gsap.registerPlugin(ScrollTrigger);
            revealItems.forEach((item) => {
                gsap.fromTo(item, { opacity: 0, y: 28 }, {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    ease: 'power2.out',
                    scrollTrigger: { trigger: item, start: 'top 88%', once: true },
                    onComplete: () => item.classList.add('is-visible')
                });
            });
            return;
        }
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12 });
            revealItems.forEach((item) => observer.observe(item));
        } else {
            revealItems.forEach((item) => item.classList.add('is-visible'));
        }
    }

    function animateIntro() {
        const targets = hero.querySelectorAll('.eduverse-eyebrow, .eduverse-title, .eduverse-description, .eduverse-actions, .eduverse-audiences');
        if (!gsap || reduceMotion) {
            targets.forEach((item) => item.classList.add('is-visible'));
            return;
        }
        gsap.fromTo(targets, { opacity: 0, y: 22 }, {
            opacity: 1,
            y: 0,
            duration: 0.85,
            stagger: 0.14,
            delay: 0.85,
            ease: 'power3.out',
            onComplete: () => targets.forEach((item) => item.classList.add('is-visible'))
        });
    }

    function startSmoothScroll() {
        if (reduceMotion || !Lenis) return;
        try {
            lenis = new Lenis({ duration: 0.9, smoothWheel: true, anchors: true, autoRaf: true });
            document.addEventListener('show.bs.modal', () => lenis && lenis.stop());
            document.addEventListener('hidden.bs.modal', () => lenis && lenis.start());
            document.addEventListener('show.bs.offcanvas', () => lenis && lenis.stop());
            document.addEventListener('hidden.bs.offcanvas', () => lenis && lenis.start());
        } catch (error) {
            lenis = null;
        }
    }

    async function initThree() {
        let THREE;
        try {
            THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
        } catch (error) {
            heroCanvas.remove();
            return;
        }

        try {
            const small = window.innerWidth < 768;
            const renderer = new THREE.WebGLRenderer({
                canvas: heroCanvas,
                alpha: true,
                antialias: !small,
                powerPreference: 'low-power'
            });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.6));
            renderer.setClearColor(0x000000, 0);

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
            camera.position.set(0, 0, 15);
            scene.add(new THREE.AmbientLight(0xb9d8ff, 1.1));
            const keyLight = new THREE.PointLight(0x1689ff, 2.8, 34);
            keyLight.position.set(4, 5, 6);
            scene.add(keyLight);
            const cyanLight = new THREE.PointLight(0x42eaff, 2, 30);
            cyanLight.position.set(-5, -2, 5);
            scene.add(cyanLight);

            const world = new THREE.Group();
            scene.add(world);
            const globe = new THREE.Group();
            world.add(globe);

            const globeGeometry = new THREE.SphereGeometry(2.75, 28, 20);
            const globeShell = new THREE.Mesh(globeGeometry, new THREE.MeshBasicMaterial({
                color: 0x1675d1,
                wireframe: true,
                transparent: true,
                opacity: 0.24
            }));
            globe.add(globeShell);

            const pointPositions = [];
            const pointCount = small ? 100 : 180;
            for (let i = 0; i < pointCount; i++) {
                const y = 1 - (i / (pointCount - 1)) * 2;
                const radius = Math.sqrt(1 - y * y);
                const theta = Math.PI * (1 + Math.sqrt(5)) * i;
                pointPositions.push(
                    2.78 * Math.cos(theta) * radius,
                    2.78 * y,
                    2.78 * Math.sin(theta) * radius
                );
            }
            const pointGeometry = new THREE.BufferGeometry();
            pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));
            const globePoints = new THREE.Points(pointGeometry, new THREE.PointsMaterial({
                color: 0x62efff,
                size: small ? 0.075 : 0.09,
                transparent: true,
                opacity: 0.9
            }));
            globe.add(globePoints);

            const core = new THREE.Mesh(
                new THREE.SphereGeometry(2.46, 28, 20),
                new THREE.MeshBasicMaterial({ color: 0x0b2b69, transparent: true, opacity: 0.18 })
            );
            globe.add(core);

            // Three orbital paths and satellites suggest connected classrooms.
            const orbitGroups = [];
            [3.7, 4.1, 4.45].forEach((radius, index) => {
                const orbit = new THREE.Group();
                orbit.rotation.set(0.55 + index * 0.28, index * 0.7, 0.35 - index * 0.3);
                const path = new THREE.Mesh(
                    new THREE.TorusGeometry(radius, 0.012, 6, 120),
                    new THREE.MeshBasicMaterial({
                        color: index === 1 ? 0x42eaff : 0x348bff,
                        transparent: true,
                        opacity: 0.38
                    })
                );
                orbit.add(path);
                const satellite = new THREE.Mesh(
                    new THREE.IcosahedronGeometry(0.12 + index * 0.025, 1),
                    new THREE.MeshStandardMaterial({
                        color: index === 1 ? 0x7af6ff : 0x5daaff,
                        emissive: index === 1 ? 0x1386a2 : 0x064c9a,
                        emissiveIntensity: 1.3,
                        roughness: 0.28
                    })
                );
                satellite.position.x = radius;
                orbit.add(satellite);
                orbit.userData.speed = 0.12 + index * 0.05;
                world.add(orbit);
                orbitGroups.push(orbit);
            });

            // Floating book-like cards and academic symbols.
            const floaters = [];
            const geometries = [
                new THREE.BoxGeometry(0.42, 0.58, 0.12),
                new THREE.OctahedronGeometry(0.27),
                new THREE.TetrahedronGeometry(0.3),
                new THREE.TorusGeometry(0.23, 0.07, 8, 24)
            ];
            const colors = [0x4bdff5, 0x4c91ff, 0x75baff];
            const floaterCount = small ? 5 : 9;
            for (let i = 0; i < floaterCount; i++) {
                const object = new THREE.Mesh(
                    geometries[i % geometries.length],
                    new THREE.MeshStandardMaterial({
                        color: colors[i % colors.length],
                        emissive: colors[i % colors.length],
                        emissiveIntensity: 0.16,
                        roughness: 0.3,
                        metalness: 0.32,
                        transparent: true,
                        opacity: 0.86
                    })
                );
                const angle = (i / floaterCount) * Math.PI * 2;
                const radius = 5.2 + Math.random() * 2.3;
                object.position.set(Math.cos(angle) * radius, (Math.random() - 0.5) * 5.6, -1.5 - Math.random() * 4);
                object.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
                object.userData = { y: object.position.y, phase: Math.random() * Math.PI * 2, speed: 0.35 + Math.random() * 0.35 };
                scene.add(object);
                floaters.push(object);
            }

            // Small star field and subtle light trails.
            const particleCount = small ? 260 : 620;
            const particlePositions = new Float32Array(particleCount * 3);
            for (let i = 0; i < particleCount; i++) {
                particlePositions[i * 3] = (Math.random() - 0.5) * 27;
                particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 15;
                particlePositions[i * 3 + 2] = -Math.random() * 15;
            }
            const particleGeometry = new THREE.BufferGeometry();
            particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
            const stars = new THREE.Points(particleGeometry, new THREE.PointsMaterial({
                color: 0x8ddfff,
                size: 0.035,
                transparent: true,
                opacity: 0.65
            }));
            scene.add(stars);

            const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
            if (!reduceMotion && !small) {
                hero.addEventListener('pointermove', (event) => {
                    if (event.pointerType && event.pointerType !== 'mouse') return;
                    const bounds = hero.getBoundingClientRect();
                    pointer.targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
                    pointer.targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
                    if (imageTarget) {
                        imageTarget.style.transform = `perspective(1000px) rotateY(${pointer.targetX * 3}deg) rotateX(${-pointer.targetY * 3}deg)`;
                    }
                });
                hero.addEventListener('pointerleave', () => {
                    pointer.targetX = 0;
                    pointer.targetY = 0;
                    if (imageTarget) imageTarget.style.transform = '';
                });
            }

            function layout() {
                const width = hero.clientWidth;
                const height = hero.clientHeight;
                if (!width || !height) return;
                renderer.setSize(width, height, false);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                const desktop = width >= 992;
                const rtl = document.documentElement.dir === 'rtl';
                world.position.set(desktop ? (rtl ? -3.2 : 3.2) : 0, desktop ? 0.1 : 0.5, -1);
                world.scale.setScalar(desktop ? 0.9 : 0.68);
            }
            layout();
            if ('ResizeObserver' in window) new ResizeObserver(layout).observe(hero);
            else window.addEventListener('resize', layout);

            const clock = new THREE.Clock();
            let running = false;
            let inView = true;
            let frameId = 0;
            function draw(time) {
                pointer.x += (pointer.targetX - pointer.x) * 0.04;
                pointer.y += (pointer.targetY - pointer.y) * 0.04;
                globe.rotation.y = time * 0.09 + pointer.x * 0.22;
                globe.rotation.x = Math.sin(time * 0.18) * 0.08 + pointer.y * 0.12;
                core.scale.setScalar(1 + Math.sin(time * 1.2) * 0.012);
                orbitGroups.forEach((orbit) => { orbit.rotation.y = time * orbit.userData.speed; });
                floaters.forEach((object) => {
                    object.position.y = object.userData.y + Math.sin(time * 0.55 + object.userData.phase) * 0.28;
                    object.rotation.y += 0.002 * object.userData.speed;
                    object.rotation.x += 0.0015 * object.userData.speed;
                });
                stars.rotation.y = time * 0.006;
                camera.position.x = pointer.x * 0.28;
                camera.position.y = -pointer.y * 0.18;
                camera.lookAt(0, 0, 0);
                renderer.render(scene, camera);
            }
            function tick() {
                if (!running) return;
                draw(clock.getElapsedTime());
                frameId = requestAnimationFrame(tick);
            }
            function play() {
                if (running || reduceMotion) return;
                running = true;
                clock.start();
                tick();
            }
            function pause() {
                running = false;
                if (frameId) cancelAnimationFrame(frameId);
            }

            if (reduceMotion) {
                draw(0.6);
            } else {
                if ('IntersectionObserver' in window) {
                    new IntersectionObserver((entries) => {
                        inView = entries[0].isIntersecting;
                        if (inView && !document.hidden) play();
                        else pause();
                    }, { threshold: 0.05 }).observe(hero);
                }
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden) pause();
                    else if (inView) play();
                });
                play();
            }
            heroCanvas.classList.add('is-ready');
        } catch (error) {
            heroCanvas.remove();
        }
    }

    async function loadMotionLibraries() {
        const results = await Promise.allSettled([
            import('https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js'),
            import('https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js'),
            import('https://cdn.jsdelivr.net/npm/lenis@1.1.20/+esm')
        ]);
        if (results[0].status === 'fulfilled') gsap = results[0].value.gsap || results[0].value.default || null;
        if (results[1].status === 'fulfilled') ScrollTrigger = results[1].value.ScrollTrigger || results[1].value.default || null;
        if (results[2].status === 'fulfilled') Lenis = results[2].value.default || results[2].value.Lenis || null;
        animateIntro();
        revealSections();
        startSmoothScroll();
    }

    loadMotionLibraries().catch(() => {
        animateIntro();
        revealSections();
    });
    initThree();
})();
