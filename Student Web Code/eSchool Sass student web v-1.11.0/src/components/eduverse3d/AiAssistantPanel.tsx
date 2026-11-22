'use client';

import { useId, useState } from 'react';
import { GlassPanel } from './GlassPanel';

export type AssistantRole = 'main_admin' | 'school_admin' | 'teacher' | 'student' | 'parent';

const ASSISTANT_NAMES: Record<AssistantRole, string> = {
  main_admin: 'Platform Intelligence Assistant',
  school_admin: 'School Operations Assistant',
  teacher: 'Teaching Assistant',
  student: 'AI Study Tutor',
  parent: 'Parent Insight Assistant',
};

/**
 * Role-specific AI assistant shell. No AI provider is configured in the
 * backend yet, so this renders an honest "not connected" state and never
 * fabricates answers. When a backend endpoint exists, wire it in `onAsk`.
 */
export function AiAssistantPanel({
  role,
  translate,
  onAsk,
}: {
  role: AssistantRole;
  translate: (key: string) => string;
  /** Provide once a server-side AI endpoint exists. */
  onAsk?: (question: string) => Promise<string>;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const panelId = useId();
  const connected = typeof onAsk === 'function';

  const submit = async () => {
    if (!onAsk || !question.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      setAnswer(await onAsk(question.trim()));
    } catch {
      setError(translate('The assistant could not answer. Try again in a moment.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="pointer-events-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="group flex items-center gap-2 rounded-full border border-cyan-300/30 bg-[rgba(10,20,48,0.7)] py-1.5 pl-1.5 pr-3 text-sm text-cyan-50 backdrop-blur-md transition-colors hover:bg-[rgba(20,40,90,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        <span
          aria-hidden="true"
          className="h-7 w-7 rounded-full bg-[radial-gradient(circle_at_35%_35%,#a5f3fc,#2563eb_60%,#0b1a3f)] shadow-[0_0_18px_rgba(34,211,238,0.6)]"
        />
        {translate(ASSISTANT_NAMES[role])}
      </button>

      {open && (
        <GlassPanel className="mt-2 w-[min(22rem,calc(100vw-3rem))] p-4" as="section">
          <div id={panelId}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">{translate(ASSISTANT_NAMES[role])}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  connected ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-400/15 text-amber-200'
                }`}
              >
                {connected ? translate('Connected') : translate('Not connected')}
              </span>
            </div>

            {!connected && (
              <p className="mt-2 text-xs leading-relaxed text-sky-100/75">
                {translate(
                  'The AI assistant is not configured for your school yet. Your school administrator needs to connect an AI provider on the server before it can answer questions.',
                )}
              </p>
            )}

            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <label className="sr-only" htmlFor={`${panelId}-q`}>
                {translate('Ask a question')}
              </label>
              <input
                id={`${panelId}-q`}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={!connected || pending}
                placeholder={translate('Ask a question')}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-sky-100/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!connected || pending || !question.trim()}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? translate('Asking…') : translate('Ask')}
              </button>
            </form>

            {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
            {answer && <p className="mt-3 whitespace-pre-wrap text-sm text-sky-50">{answer}</p>}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
