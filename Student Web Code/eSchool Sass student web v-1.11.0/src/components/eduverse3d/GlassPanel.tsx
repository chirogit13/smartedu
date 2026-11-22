'use client';

import type { ReactNode } from 'react';

export function GlassPanel({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'aside';
}) {
  return (
    <Tag
      className={`rounded-2xl border border-white/10 bg-[rgba(10,20,48,0.62)] shadow-[0_8px_32px_rgba(2,8,23,0.45)] backdrop-blur-md ${className}`}
    >
      {children}
    </Tag>
  );
}

export function StatTile({
  label,
  value,
  loading,
  accent = '#22d3ee',
}: {
  label: string;
  value: string | number | null;
  loading?: boolean;
  accent?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden="true" />
        <span className="truncate text-xs text-sky-100/70" title={label}>
          {label}
        </span>
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-white">
        {loading ? (
          <span className="inline-block h-6 w-10 rounded bg-white/10 motion-safe:animate-pulse" />
        ) : (
          (value ?? '—')
        )}
      </div>
    </div>
  );
}
