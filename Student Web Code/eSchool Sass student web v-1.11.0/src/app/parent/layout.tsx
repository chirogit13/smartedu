import type { ReactNode } from 'react';
import { ParentSessionProvider } from '@/components/parent/ParentSessionProvider';

export default function ParentLayout({ children }: { children: ReactNode }) {
  return (
    <ParentSessionProvider>
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#0b1a3f_0%,#050a1c_60%)] text-white">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </ParentSessionProvider>
  );
}
