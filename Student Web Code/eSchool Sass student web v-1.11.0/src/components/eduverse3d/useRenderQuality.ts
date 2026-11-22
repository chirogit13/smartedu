'use client';

import { useEffect, useState } from 'react';

export type QualityTier = 'high' | 'medium' | 'low';

export interface RenderQuality {
  /** null while detecting on the client */
  webgl: boolean | null;
  reducedMotion: boolean;
  tier: QualityTier;
  maxDpr: number;
  particleCount: number;
  antialias: boolean;
}

const DEFAULT_QUALITY: RenderQuality = {
  webgl: null,
  reducedMotion: false,
  tier: 'medium',
  maxDpr: 1.5,
  particleCount: 400,
  antialias: true,
};

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return !!gl;
  } catch {
    return false;
  }
}

function detectTier(): QualityTier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const smallScreen = window.matchMedia('(max-width: 640px)').matches;
  if (cores <= 4 || memory <= 2) return 'low';
  if (smallScreen || cores <= 6 || memory <= 4) return 'medium';
  return 'high';
}

const TIER_SETTINGS: Record<QualityTier, Pick<RenderQuality, 'maxDpr' | 'particleCount' | 'antialias'>> = {
  high: { maxDpr: 2, particleCount: 900, antialias: true },
  medium: { maxDpr: 1.5, particleCount: 450, antialias: true },
  low: { maxDpr: 1, particleCount: 160, antialias: false },
};

/**
 * Detects WebGL support, reduced-motion preference and a device quality tier
 * so 3D scenes can degrade gracefully (fewer particles, lower DPR, static frames).
 */
export function useRenderQuality(): RenderQuality {
  const [quality, setQuality] = useState<RenderQuality>(DEFAULT_QUALITY);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compute = () => {
      const tier = detectTier();
      setQuality({
        webgl: detectWebGL(),
        reducedMotion: motionQuery.matches,
        tier,
        ...TIER_SETTINGS[tier],
      });
    };
    compute();
    motionQuery.addEventListener('change', compute);
    return () => motionQuery.removeEventListener('change', compute);
  }, []);

  return quality;
}
