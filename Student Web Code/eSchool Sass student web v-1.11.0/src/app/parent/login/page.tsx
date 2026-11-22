'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslate } from '@/components/hooks/useTranslate';
import { useParentSession } from '@/components/parent/ParentSessionProvider';
import { GlassPanel } from '@/components/eduverse3d/GlassPanel';

const inputClass =
  'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-sky-100/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300';

export default function ParentLoginPage() {
  const translate = useTranslate();
  const router = useRouter();
  const { ready, session, login } = useParentSession();
  const [schoolCode, setSchoolCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && session) router.replace('/parent/dashboard');
  }, [ready, session, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await login({ email: email.trim(), password, schoolCode: schoolCode.trim() });
      router.replace('/parent/dashboard');
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : translate('Login failed. Try again.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <GlassPanel className="w-full max-w-md p-6 sm:p-8" as="section">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">{translate('Smart EduVerse')}</p>
        <h1 className="mt-1 text-xl font-semibold text-white">{translate('Parent login')}</h1>
        <p className="mt-1 text-sm text-sky-100/70">
          {translate('Use the guardian account your school created for you.')}
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-1.5">
            <label htmlFor="parent-school-code" className="text-sm text-sky-50">
              {translate('School code')}
            </label>
            <input
              id="parent-school-code"
              required
              autoComplete="organization"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="parent-email" className="text-sm text-sky-50">
              {translate('Email')}
            </label>
            <input
              id="parent-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="parent-password" className="text-sm text-sky-50">
              {translate('Password')}
            </label>
            <input
              id="parent-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || !schoolCode.trim() || !email.trim() || !password}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? translate('Signing in…') : translate('Sign in')}
          </button>
        </form>
      </GlassPanel>
    </div>
  );
}
