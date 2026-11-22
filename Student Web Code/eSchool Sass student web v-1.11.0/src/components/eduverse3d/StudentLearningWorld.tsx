'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/components/store';
import { useTranslate } from '@/components/hooks/useTranslate';
import {
  useGetExamMarks,
  useGetStudentAssignments,
  useGetStudentProfile,
  useGetStudentSubjects,
} from '@/lib/api/student/queryHooks';
import { useRenderQuality } from './useRenderQuality';
import { Scene3DBoundary, SceneFallback2D, SceneLoading } from './Scene3D';
import { GlassPanel, StatTile } from './GlassPanel';
import { AiAssistantPanel } from './AiAssistantPanel';
import type { WorldStation } from './LearningWorldCanvas';

function TranslatedLoading() {
  const translate = useTranslate();
  return <SceneLoading label={translate('Loading 3D learning world…')} />;
}

// three.js is only downloaded in the browser, after the dashboard shell renders.
const LearningWorldCanvas = dynamic(() => import('./LearningWorldCanvas'), {
  ssr: false,
  loading: () => <TranslatedLoading />,
});

/* ---------- defensive readers: the API payloads are loosely typed ---------- */
type Loose = Record<string, unknown> | undefined | null;
const obj = (v: unknown): Loose =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function countSubjects(payload: unknown): number | null {
  const root = obj(payload);
  if (!root) return null;
  const data = obj(root.data) ?? root;
  return arr(data.core_subjects).length + arr(data.elective_subjects).length;
}

function countAssignments(payload: unknown): number | null {
  const root = obj(payload);
  if (!root) return null;
  const data = obj(root.data);
  const total = (data && data.total) ?? root.total;
  if (typeof total === 'number') return total;
  if (Array.isArray(root.data)) return root.data.length;
  if (data && Array.isArray(data.data)) return data.data.length;
  return null;
}

function averagePercentage(payload: unknown): number | null {
  const root = obj(payload);
  if (!root) return null;
  const values = arr(root.data)
    .map((item) => Number(obj(obj(item)?.result)?.percentage))
    .filter((n) => Number.isFinite(n));
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function readClassName(payload: unknown): string {
  const root = obj(payload);
  const data = obj(root?.data) ?? root;
  const classSection = obj(data?.class_section);
  const klass = obj(classSection?.class);
  const name = klass?.name ?? classSection?.full_name ?? classSection?.name;
  return typeof name === 'string' ? name : '';
}

function readFirstName(payload: unknown): string {
  const root = obj(payload);
  const data = obj(root?.data) ?? root;
  const user = obj(data?.user) ?? data;
  const name = user?.first_name ?? user?.full_name;
  return typeof name === 'string' ? name : '';
}

export type AgeLevel = 'early' | 'primary' | 'secondary';

/** Derives the visual age band from the class name (Nursery/KG → early, 1–5 → primary). */
export function ageLevelFromClass(className: string): AgeLevel {
  const n = className.toLowerCase();
  if (/(nursery|pre|play|kg|lkg|ukg|kinder)/.test(n)) return 'early';
  const num = parseInt(n.replace(/[^0-9]/g, ''), 10);
  if (Number.isFinite(num) && num <= 5) return 'primary';
  return 'secondary';
}

/**
 * Student 3D "Learning World": a lazily loaded R3F scene whose stations link to
 * existing student pages and show real counts from the Laravel student API.
 * Falls back to a 2D view when WebGL is missing or the scene fails.
 */
export default function StudentLearningWorld() {
  const translate = useTranslate();
  const router = useRouter();
  const quality = useRenderQuality();
  const schoolCode = useAppSelector((state) => state.studentAuth.schoolCode);

  const profile = useGetStudentProfile(schoolCode);
  const subjects = useGetStudentSubjects();
  const pending = useGetStudentAssignments({ is_submitted: 0 });
  const marks = useGetExamMarks();

  const [activeId, setActiveId] = useState<string | null>(null);

  const subjectCount = countSubjects(subjects.data);
  const pendingCount = countAssignments(pending.data);
  const avgScore = averagePercentage(marks.data);
  const className = readClassName(profile.data);
  const firstName = readFirstName(profile.data);
  const ageLevel = ageLevelFromClass(className);

  const stations: (WorldStation & { detail: string })[] = [
    {
      id: 'subjects',
      label: translate('Subjects'),
      href: '/student/subjects',
      color: '#3b82f6',
      detail: subjectCount === null ? '' : String(subjectCount),
    },
    {
      id: 'assignments',
      label: translate('Assignments'),
      href: '/student/assignments',
      color: '#22d3ee',
      detail: pendingCount === null ? '' : `${pendingCount} ${translate('pending')}`,
    },
    {
      id: 'exams',
      label: translate('Exams'),
      href: '/student/exams',
      color: '#818cf8',
      detail: '',
    },
    {
      id: 'result',
      label: translate('Results'),
      href: '/student/result',
      color: '#34d399',
      detail: avgScore === null ? '' : `${avgScore}%`,
    },
    {
      id: 'timetable',
      label: translate('Timetable'),
      href: '/student/timetable',
      color: '#f59e0b',
      detail: '',
    },
    {
      id: 'noticeboard',
      label: translate('Noticeboard'),
      href: '/student/noticeboard',
      color: '#f472b6',
      detail: '',
    },
  ];

  const show3D = quality.webgl === true;
  const ageTitle =
    ageLevel === 'early'
      ? translate('My Play & Learn World')
      : ageLevel === 'primary'
        ? translate('My Learning World')
        : translate('My Learning Universe');

  return (
    <section
      aria-labelledby="ev3d-student-world-title"
      className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-[#060d24] text-white"
    >
      {/* Scene layer */}
      <div className="relative h-[340px] sm:h-[400px] lg:h-[460px]">
        {quality.webgl === null ? (
          <TranslatedLoading />
        ) : show3D ? (
          <Scene3DBoundary fallback={<SceneFallback2D />}>
            <LearningWorldCanvas
              stations={stations}
              quality={quality}
              ageLevel={ageLevel}
              activeId={activeId}
              onHover={setActiveId}
              onSelect={(s) => router.push(s.href)}
            />
          </Scene3DBoundary>
        ) : (
          <SceneFallback2D />
        )}

        {/* Overlay: title + assistant */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
          <div className="pointer-events-auto max-w-[70%]">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">
              {translate('Smart EduVerse')}
            </p>
            <h2 id="ev3d-student-world-title" className="mt-1 text-lg font-semibold sm:text-xl">
              {firstName ? `${ageTitle} · ${firstName}` : ageTitle}
            </h2>
            {className && <p className="text-xs text-sky-100/70">{className}</p>}
          </div>
          <AiAssistantPanel role="student" translate={translate} />
        </div>
      </div>

      {/* Accessible station list doubles as the 2D navigation */}
      <div className="relative -mt-20 px-3 pb-3 sm:-mt-24 sm:px-4 sm:pb-4">
        <GlassPanel className="p-3 sm:p-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <StatTile
              label={translate('Subjects')}
              value={subjectCount}
              loading={subjects.isLoading}
              accent="#3b82f6"
            />
            <StatTile
              label={translate('Pending assignments')}
              value={pendingCount}
              loading={pending.isLoading}
              accent="#22d3ee"
            />
            <StatTile
              label={translate('Average score')}
              value={avgScore === null ? null : `${avgScore}%`}
              loading={marks.isLoading}
              accent="#34d399"
            />
          </div>

          <nav aria-label={translate('Learning stations')} className="mt-3">
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {stations.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => router.push(s.href)}
                    onMouseEnter={() => setActiveId(s.id)}
                    onMouseLeave={() => setActiveId(null)}
                    onFocus={() => setActiveId(s.id)}
                    onBlur={() => setActiveId(null)}
                    className={`flex w-full min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                      activeId === s.id
                        ? 'border-cyan-300/50 bg-cyan-300/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate" title={s.label}>
                      {s.label}
                    </span>
                    {s.detail && (
                      <span className="shrink-0 text-xs tabular-nums text-sky-100/70">{s.detail}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          {!show3D && quality.webgl === false && (
            <p className="mt-2 text-xs text-sky-100/60">
              {translate('3D view is unavailable on this device, showing the 2D view.')}
            </p>
          )}
        </GlassPanel>
      </div>
    </section>
  );
}
