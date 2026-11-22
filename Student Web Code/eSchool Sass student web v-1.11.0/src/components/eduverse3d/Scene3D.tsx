'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Scene3DBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface Scene3DBoundaryState {
  failed: boolean;
}

/**
 * Catches WebGL / Three.js runtime failures (lost context, driver issues)
 * and swaps the scene for the 2D fallback instead of breaking the dashboard.
 */
export class Scene3DBoundary extends Component<Scene3DBoundaryProps, Scene3DBoundaryState> {
  state: Scene3DBoundaryState = { failed: false };

  static getDerivedStateFromError(): Scene3DBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[eduverse3d] 3D scene failed, showing 2D fallback', error, info);
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Shimmer shown while the 3D bundle is downloading. */
export function SceneLoading({ label }: { label: string }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 text-cyan-100/80">
        <span className="h-14 w-14 rounded-full border-2 border-cyan-300/30 border-t-cyan-300 motion-safe:animate-spin" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}

/** Static 2D backdrop used when WebGL is unavailable or the scene crashed. */
export function SceneFallback2D() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at 50% 45%, rgba(37,99,235,0.55) 0, rgba(37,99,235,0.15) 22%, transparent 45%), radial-gradient(circle at 80% 20%, rgba(34,211,238,0.25) 0, transparent 35%)',
      }}
    >
      <div className="absolute left-1/2 top-[45%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/30" />
      <div className="absolute left-1/2 top-[45%] h-64 w-[26rem] max-w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-sky-400/25" />
    </div>
  );
}
