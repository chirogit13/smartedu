'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslate } from '@/components/hooks/useTranslate';
import { useParentSession } from '@/components/parent/ParentSessionProvider';
import {
  getChildAttendance,
  getChildClassAnnouncements,
  getChildExamMarks,
  getChildPendingAssignments,
  getParentData,
  normalizeChildren,
} from '@/lib/api/parent/parentClient';
import { useRenderQuality } from './useRenderQuality';
import { Scene3DBoundary, SceneFallback2D, SceneLoading } from './Scene3D';
import { GlassPanel, StatTile } from './GlassPanel';
import { AiAssistantPanel } from './AiAssistantPanel';
import { attendancePercentage, averagePercentage, listRows, obj, str, totalCount } from './apiReaders';
import type { WorldStation } from './LearningWorldCanvas';

function TranslatedLoading() {
  const translate = useTranslate();
  return <SceneLoading label={translate('Loading 3D family view…')} />;
}

const LearningWorldCanvas = dynamic(() => import('./LearningWorldCanvas'), {
  ssr: false,
  loading: () => <TranslatedLoading />,
});

const CHILD_COLORS = ['#22d3ee', '#3b82f6', '#a78bfa', '#34d399', '#f59e0b', '#f472b6'];

/**
 * Parent dashboard: each linked child orbits the family core in 3D.
 * Selecting a child loads that child's attendance, pending assignments,
 * exam average and class notices from /api/parent/* (ownership is checked
 * server-side for every child_id).
 */
export default function ParentFamilyWorld() {
  const translate = useTranslate();
  const router = useRouter();
  const quality = useRenderQuality();
  const { ready, session, selectedChildId, selectChild, logout } = useParentSession();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !session) router.replace('/parent/login');
  }, [ready, session, router]);

  const enabled = ready && !!session;
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Refresh the children list from the server (source of truth).
  const parentData = useQuery({
    queryKey: ['parent', 'data', session?.schoolCode],
    queryFn: getParentData,
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const serverChildren = normalizeChildren(obj(obj(parentData.data)?.data)?.children);
  const children = parentData.isSuccess ? serverChildren : (session?.children ?? []);

  const childId =
    selectedChildId !== null && children.some((c) => c.id === selectedChildId)
      ? selectedChildId
      : (children[0]?.id ?? null);
  const child = children.find((c) => c.id === childId) ?? null;
  const childEnabled = enabled && childId !== null;

  const attendance = useQuery({
    queryKey: ['parent', 'attendance', childId, month, year],
    queryFn: () => getChildAttendance(childId as number, month, year),
    enabled: childEnabled,
    retry: 1,
  });
  const pending = useQuery({
    queryKey: ['parent', 'assignments', childId, 0],
    queryFn: () => getChildPendingAssignments(childId as number),
    enabled: childEnabled,
    retry: 1,
  });
  const marks = useQuery({
    queryKey: ['parent', 'exam-marks', childId],
    queryFn: () => getChildExamMarks(childId as number),
    enabled: childEnabled,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  const notices = useQuery({
    queryKey: ['parent', 'announcements', childId],
    queryFn: () => getChildClassAnnouncements(childId as number),
    enabled: childEnabled,
    retry: 1,
  });

  if (!ready || !session) {
    return (
      <div className="relative min-h-[60vh]">
        <TranslatedLoading />
      </div>
    );
  }

  const attendancePct = attendancePercentage(attendance.data);
  const pendingCount = totalCount(pending.data);
  const avgScore = averagePercentage(marks.data);
  const noticeRows = listRows(notices.data).slice(0, 5);

  const stations: WorldStation[] = children.map((c, i) => ({
    id: String(c.id),
    label: c.name || translate('Child'),
    href: '',
    color: CHILD_COLORS[i % CHILD_COLORS.length],
  }));

  const anyError = attendance.isError || pending.isError || marks.isError;
  const show3D = quality.webgl === true;

  return (
    <div className="space-y-4 md:space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">{translate('Smart EduVerse')}</p>
          <h1 className="truncate text-xl font-semibold text-white sm:text-2xl">
            {session.parentName
              ? `${translate('Family overview')} · ${session.parentName}`
              : translate('Family overview')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <AiAssistantPanel role="parent" translate={translate} />
          <button
            type="button"
            onClick={() => {
              void logout().then(() => router.replace('/parent/login'));
            }}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-sky-50 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            {translate('Log out')}
          </button>
        </div>
      </header>

      <section
        aria-label={translate('Children')}
        className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-[#060d24]"
      >
        <div className="relative h-[300px] sm:h-[360px] lg:h-[420px]">
          {quality.webgl === null ? (
            <TranslatedLoading />
          ) : show3D && stations.length > 0 ? (
            <Scene3DBoundary fallback={<SceneFallback2D />}>
              <LearningWorldCanvas
                stations={stations}
                quality={quality}
                ageLevel="early"
                activeId={activeId ?? (childId !== null ? String(childId) : null)}
                onHover={setActiveId}
                onSelect={(s) => selectChild(Number(s.id))}
              />
            </Scene3DBoundary>
          ) : (
            <SceneFallback2D />
          )}
        </div>

        <div className="relative -mt-16 px-3 pb-3 sm:px-4 sm:pb-4">
          <GlassPanel className="p-3 sm:p-4">
            {children.length === 0 ? (
              <p className="text-sm text-sky-100/80">
                {parentData.isLoading
                  ? translate('Loading children…')
                  : translate('No active children are linked to this account.')}
              </p>
            ) : (
              <div role="radiogroup" aria-label={translate('Select a child')} className="flex gap-2 overflow-x-auto pb-1">
                {children.map((c, i) => {
                  const selected = c.id === childId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => selectChild(c.id)}
                      onMouseEnter={() => setActiveId(String(c.id))}
                      onMouseLeave={() => setActiveId(null)}
                      onFocus={() => setActiveId(String(c.id))}
                      onBlur={() => setActiveId(null)}
                      className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                        selected ? 'border-cyan-300/60 bg-cyan-300/10 text-white' : 'border-white/10 bg-white/5 text-sky-50 hover:bg-white/10'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: CHILD_COLORS[i % CHILD_COLORS.length] }}
                      />
                      <span className="flex flex-col">
                        <span className="font-medium">{c.name || translate('Child')}</span>
                        {c.className && <span className="text-xs text-sky-100/60">{c.className}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </GlassPanel>
        </div>
      </section>

      {child && (
        <section aria-labelledby="ev3d-parent-child-title" className="grid gap-4 lg:grid-cols-3">
          <GlassPanel className="p-4 lg:col-span-2">
            <h2 id="ev3d-parent-child-title" className="text-base font-semibold text-white">
              {child.name || translate('Child')}
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
              <StatTile
                label={translate('Attendance this month')}
                value={attendancePct === null ? null : `${attendancePct}%`}
                loading={attendance.isLoading}
                accent="#22d3ee"
              />
              <StatTile
                label={translate('Pending assignments')}
                value={pendingCount}
                loading={pending.isLoading}
                accent="#3b82f6"
              />
              <StatTile
                label={translate('Average score')}
                value={avgScore === null ? null : `${avgScore}%`}
                loading={marks.isLoading}
                accent="#34d399"
              />
            </div>
            {anyError && (
              <p className="mt-3 text-xs text-rose-300" role="alert">
                {translate('Some information could not be loaded. Refresh the page to try again.')}
              </p>
            )}
            <p className="mt-3 text-xs text-sky-100/60">
              {translate('Fees, leave requests and detailed reports are available in the parent mobile app.')}
            </p>
          </GlassPanel>

          <GlassPanel className="p-4" as="aside">
            <h2 className="text-base font-semibold text-white">{translate('Class notices')}</h2>
            {notices.isLoading ? (
              <div className="mt-3 space-y-2">
                {[0, 1, 2].map((k) => (
                  <div key={k} className="h-4 rounded bg-white/10 motion-safe:animate-pulse" />
                ))}
              </div>
            ) : notices.isError ? (
              <p className="mt-3 text-xs text-rose-300">{translate('Notices could not be loaded.')}</p>
            ) : noticeRows.length === 0 ? (
              <p className="mt-3 text-sm text-sky-100/70">{translate('No notices yet.')}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {noticeRows.map((row, i) => {
                  const n = obj(row);
                  return (
                    <li key={str(n?.id) || i} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <p className="truncate text-sm text-white" title={str(n?.title)}>
                        {str(n?.title) || translate('Notice')}
                      </p>
                      {str(n?.created_at) && (
                        <p className="text-xs text-sky-100/60">{str(n?.created_at)}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </GlassPanel>
        </section>
      )}
    </div>
  );
}
