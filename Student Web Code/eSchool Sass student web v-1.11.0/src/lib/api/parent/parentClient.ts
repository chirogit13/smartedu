/**
 * Parent (Guardian) API client for the Laravel backend.
 *
 * Talks to the existing /api/parent/* routes. Authorization stays on the
 * server: the Sanctum token identifies the guardian, the `school-code` header
 * selects the tenant database (APISwitchDatabase), and every child endpoint
 * re-checks that `child_id` belongs to the logged-in guardian.
 */
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api/student/endpoints';
import { arr, obj, str } from '@/components/eduverse3d/apiReaders';

export const PARENT_SESSION_KEY = 'eduverse_parent_session';
export const PARENT_UNAUTH_EVENT = 'eduverse-parent-unauthenticated';

export interface ParentChild {
  id: number;
  name: string;
  className: string;
  image: string | null;
}

export interface ParentSession {
  token: string;
  schoolCode: string;
  parentName: string;
  children: ParentChild[];
}

export class ParentApiError extends Error {
  code: number | null;
  constructor(message: string, code: number | null = null) {
    super(message);
    this.name = 'ParentApiError';
    this.code = code;
  }
}

let authToken: string | null = null;
let schoolCode: string | null = null;

export function setParentCredentials(token: string | null, code: string | null) {
  authToken = token;
  schoolCode = code;
}

export const parentApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: false,
  headers: { Accept: 'application/json' },
});

parentApi.interceptors.request.use((config) => {
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  if (schoolCode) config.headers['school-code'] = schoolCode;
  return config;
});

function rejectFrom(body: unknown, fallback: string): ParentApiError {
  const b = obj(body);
  const code = typeof b?.code === 'number' ? b.code : null;
  const message = str(b?.message) || fallback;
  if (code === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PARENT_UNAUTH_EVENT));
  }
  return new ParentApiError(message, code);
}

parentApi.interceptors.response.use(
  (response) => {
    const body = obj(response.data);
    if (body && body.error === true) {
      return Promise.reject(rejectFrom(body, 'Request failed'));
    }
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 401 && typeof window !== 'undefined') {
        window.dispatchEvent(new Event(PARENT_UNAUTH_EVENT));
      }
      return Promise.reject(rejectFrom(error.response.data, error.message));
    }
    return Promise.reject(new ParentApiError('Network error. Check your connection and try again.'));
  },
);

/** Map the guardian `children` (Students models) to a compact shape. */
export function normalizeChildren(raw: unknown): ParentChild[] {
  return arr(raw)
    .map((item) => {
      const child = obj(item);
      const user = obj(child?.user);
      const classSection = obj(child?.class_section);
      const klass = obj(classSection?.class);
      const section = obj(classSection?.section);
      const id = Number(child?.id);
      if (!Number.isFinite(id)) return null;
      const name =
        [str(user?.first_name), str(user?.last_name)].filter(Boolean).join(' ') ||
        str(user?.full_name);
      const className =
        str(classSection?.full_name) ||
        [str(klass?.name), str(section?.name)].filter(Boolean).join(' - ');
      const image = str(user?.image) || null;
      return { id, name, className, image } satisfies ParentChild;
    })
    .filter((c): c is ParentChild => c !== null);
}

export async function parentLogin(input: {
  email: string;
  password: string;
  schoolCode: string;
}): Promise<ParentSession> {
  const form = new FormData();
  form.append('email', input.email);
  form.append('password', input.password);
  form.append('school_code', input.schoolCode);
  const { data } = await parentApi.post('/parent/login', form);
  const body = obj(data);
  const token = str(body?.token);
  if (!token) throw new ParentApiError('Login failed. No session was returned.');
  const user = obj(body?.data);
  return {
    token,
    schoolCode: input.schoolCode,
    parentName: [str(user?.first_name), str(user?.last_name)].filter(Boolean).join(' '),
    children: normalizeChildren(user?.children),
  };
}

export async function parentLogout(): Promise<void> {
  // Revokes the current token server-side (route: POST /api/logout).
  await parentApi.post('/logout');
}

export async function getParentData(): Promise<unknown> {
  const { data } = await parentApi.get('/parent/get-data');
  return data;
}

export async function getChildAttendance(childId: number, month: number, year: number) {
  const { data } = await parentApi.get('/parent/attendance', {
    params: { child_id: childId, month, year },
  });
  return data as unknown;
}

export async function getChildPendingAssignments(childId: number) {
  const { data } = await parentApi.get('/parent/assignments', {
    params: { child_id: childId, is_submitted: 0 },
  });
  return data as unknown;
}

export async function getChildExamMarks(childId: number) {
  const { data } = await parentApi.get('/parent/exam-marks', { params: { child_id: childId } });
  return data as unknown;
}

export async function getChildClassAnnouncements(childId: number) {
  const { data } = await parentApi.get('/parent/announcements', {
    params: { child_id: childId, type: 'class' },
  });
  return data as unknown;
}
