'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { RenderQuality } from './useRenderQuality';

export interface WorldStation {
  id: string;
  label: string;
  href: string;
  /** Hex color used for the station mesh */
  color: string;
}

interface LearningWorldCanvasProps {
  stations: WorldStation[];
  quality: RenderQuality;
  ageLevel: 'early' | 'primary' | 'secondary';
  activeId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (station: WorldStation) => void;
}

/** Lowers the device pixel ratio when frames get slow (adaptive quality). */
function AdaptiveDpr({ maxDpr }: { maxDpr: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const samples = useRef<number[]>([]);
  const dpr = useRef(maxDpr);
  useFrame((_, delta) => {
    samples.current.push(delta);
    if (samples.current.length < 90) return;
    const avg = samples.current.reduce((a, b) => a + b, 0) / samples.current.length;
    samples.current = [];
    if (avg > 1 / 40 && dpr.current > 1) {
      dpr.current = Math.max(1, dpr.current - 0.25);
      setDpr(dpr.current);
    } else if (avg < 1 / 58 && dpr.current < maxDpr) {
      dpr.current = Math.min(maxDpr, dpr.current + 0.25);
      setDpr(dpr.current);
    }
  });
  return null;
}

function KnowledgeCore({ animate }: { animate: boolean }) {
  const core = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (!animate) return;
    if (core.current) core.current.rotation.y += delta * 0.25;
    if (shell.current) {
      shell.current.rotation.x -= delta * 0.08;
      shell.current.rotation.y += delta * 0.12;
    }
  });
  return (
    <group>
      <mesh ref={core}>
        <icosahedronGeometry args={[0.9, 2]} />
        <meshStandardMaterial
          color="#1d4ed8"
          emissive="#2563eb"
          emissiveIntensity={0.6}
          metalness={0.4}
          roughness={0.25}
          flatShading
        />
      </mesh>
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.35, 1]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

function OrbitRing({ radius }: { radius: number }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.008, 8, 128]} />
      <meshBasicMaterial color="#38bdf8" transparent opacity={0.35} />
    </mesh>
  );
}

function Station({
  station,
  index,
  total,
  radius,
  animate,
  active,
  ageLevel,
  onHover,
  onSelect,
}: {
  station: WorldStation;
  index: number;
  total: number;
  radius: number;
  animate: boolean;
  active: boolean;
  ageLevel: LearningWorldCanvasProps['ageLevel'];
  onHover: (id: string | null) => void;
  onSelect: (station: WorldStation) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const baseAngle = (index / total) * Math.PI * 2;
  const speed = ageLevel === 'early' ? 0.06 : 0.1;

  useFrame((state) => {
    const t = animate ? state.clock.getElapsedTime() : 0;
    const angle = baseAngle + t * speed;
    if (group.current) {
      group.current.position.set(
        Math.cos(angle) * radius,
        Math.sin(t * 0.8 + index) * 0.12,
        Math.sin(angle) * radius,
      );
    }
    if (mesh.current) {
      const target = active ? 1.35 : 1;
      if (animate) {
        mesh.current.rotation.y += 0.01;
        const next = THREE.MathUtils.lerp(mesh.current.scale.x, target, 0.15);
        mesh.current.scale.setScalar(next);
      } else {
        mesh.current.scale.setScalar(target);
      }
    }
  });

  const size = ageLevel === 'early' ? 0.38 : 0.3;

  return (
    <group ref={group}>
      <mesh
        ref={mesh}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(station.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(station);
        }}
      >
        {ageLevel === 'early' ? (
          <sphereGeometry args={[size, 24, 24]} />
        ) : (
          <octahedronGeometry args={[size, 0]} />
        )}
        <meshStandardMaterial
          color={station.color}
          emissive={station.color}
          emissiveIntensity={active ? 0.9 : 0.4}
          metalness={0.3}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

function Particles({ count, animate }: { count: number; animate: boolean }) {
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.6;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    if (animate && points.current) points.current.rotation.y += delta * 0.02;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial color="#67e8f9" size={0.03} sizeAttenuation transparent opacity={0.7} />
    </points>
  );
}

function ResponsiveCamera() {
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  useEffect(() => {
    const z = width < 480 ? 9.5 : width < 900 ? 8 : 7;
    camera.position.set(0, 2.6, z);
    camera.lookAt(0, 0, 0);
  }, [camera, width]);
  return null;
}

export default function LearningWorldCanvas({
  stations,
  quality,
  ageLevel,
  activeId,
  onHover,
  onSelect,
}: LearningWorldCanvasProps) {
  const animate = !quality.reducedMotion;
  const [visible, setVisible] = useState(true);
  const wrapper = useRef<HTMLDivElement>(null);

  // Pause rendering when the scene is scrolled out of view.
  useEffect(() => {
    const el = wrapper.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(
    () => () => {
      document.body.style.cursor = '';
    },
    [],
  );

  const frameloop = animate && visible ? 'always' : 'demand';

  return (
    <div ref={wrapper} className="absolute inset-0">
      <Canvas
        frameloop={frameloop}
        dpr={[1, quality.maxDpr]}
        gl={{ antialias: quality.antialias, powerPreference: 'high-performance', alpha: true }}
        camera={{ fov: 45, near: 0.1, far: 100, position: [0, 2.6, 7] }}
        aria-hidden="true"
      >
        <ResponsiveCamera />
        {animate && <AdaptiveDpr maxDpr={quality.maxDpr} />}
        <ambientLight intensity={0.45} />
        <pointLight position={[4, 5, 4]} intensity={40} color="#60a5fa" />
        <pointLight position={[-5, -2, -3]} intensity={25} color="#22d3ee" />
        <KnowledgeCore animate={animate} />
        <OrbitRing radius={2.6} />
        {stations.map((station, i) => (
          <Station
            key={station.id}
            station={station}
            index={i}
            total={stations.length}
            radius={2.6}
            animate={animate}
            active={activeId === station.id}
            ageLevel={ageLevel}
            onHover={onHover}
            onSelect={onSelect}
          />
        ))}
        <Particles count={quality.particleCount} animate={animate} />
      </Canvas>
    </div>
  );
}
