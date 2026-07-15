import { Platform } from 'react-native';
import { API_URL as BASE_URL } from '@/config';

// Called when any API request gets 401 — wired up in _layout.tsx
let _unauthorizedHandler: (() => void) | null = null;
export const setUnauthorizedHandler = (cb: () => void) => { _unauthorizedHandler = cb; };

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const rethrowServerError = (error: unknown) => {
  if (error instanceof ApiError) throw error;
};

export const getApiErrorMessage = (error: unknown, fallback = 'เกิดข้อผิดพลาด กรุณาลองใหม่') =>
  error instanceof Error && error.message ? error.message : fallback;

// Cross-platform key-value storage (web → localStorage, native → AsyncStorage)
const storage = {
  async get(key: string): Promise<any> {
    try {
      if (Platform.OS === 'web') {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : null;
      }
      const { default: AS } = await import('@react-native-async-storage/async-storage');
      const v = await AS.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  async set(key: string, val: any): Promise<void> {
    try {
      const s = JSON.stringify(val);
      if (Platform.OS === 'web') {
        localStorage.setItem(key, s);
      } else {
        const { default: AS } = await import('@react-native-async-storage/async-storage');
        await AS.setItem(key, s);
      }
    } catch {}
  },
  async remove(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
      } else {
        const { default: AS } = await import('@react-native-async-storage/async-storage');
        await AS.removeItem(key);
      }
    } catch {}
  },
};

// Seed data shown on first launch (demo mode)
const SEED = {
  researchers: [
    { id: 1, name: 'ภาศพงศ์ องค์ธนาวัฒน์', faculty: 'วิทยาศาสตร์และเทคโนโลยี', expertise: 'วิทยาการคอมพิวเตอร์', email: 'admin@admin.com', phone: '055-123-456' },
    { id: 2, name: 'สมชาย ใจดี', faculty: 'ครุศาสตร์', expertise: 'การศึกษาปฐมวัย', email: 'somchai@uru.ac.th', phone: '055-234-567' },
    { id: 3, name: 'นารี สุขสงบ', faculty: 'มนุษยศาสตร์และสังคมศาสตร์', expertise: 'ภาษาถิ่น', email: 'naree@uru.ac.th', phone: '055-345-678' },
  ],
  projects: [
    { id: 1, title: 'AI เพื่อการเกษตรอัจฉริยะ', researcher: 'ภาศพงศ์ องค์ธนาวัฒน์', budget: '250000', year: '2566', status: 'กำลังดำเนินการ' },
    { id: 2, title: 'การพัฒนาและอนุรักษ์ภาษาถิ่นเหนือ', researcher: 'นารี สุขสงบ', budget: '150000', year: '2566', status: 'เสร็จสิ้น' },
    { id: 3, title: 'นวัตกรรมการเรียนรู้ปฐมวัยผ่านเทคโนโลยี', researcher: 'สมชาย ใจดี', budget: '180000', year: '2567', status: 'อนุมัติแล้ว' },
  ],
  articles: [
    { id: 1, title: 'Machine Learning Applications in Thai Agriculture', author: 'ภาศพงศ์ องค์ธนาวัฒน์', journal: 'Thai Journal of Science and Technology', year: '2566', status: 'ตีพิมพ์แล้ว', cited: 12 },
    { id: 2, title: 'การอนุรักษ์ภาษาถิ่นด้วยเทคโนโลยีดิจิทัล', author: 'นารี สุขสงบ', journal: 'วารสารมนุษยศาสตร์ มรอ.', year: '2565', status: 'ตีพิมพ์แล้ว', cited: 5 },
    { id: 3, title: 'Active Learning in Early Childhood Education', author: 'สมชาย ใจดี', journal: 'Journal of Education Research', year: '2566', status: 'รอตีพิมพ์', cited: 0 },
  ],
  proposals: [
    { id: 1, title: 'วิจัยปัญญาประดิษฐ์เพื่อการเกษตรยั่งยืน', researcher: 'ภาศพงศ์ องค์ธนาวัฒน์', type: 'ทุนภายใน', budget: '300000', year: '2567', status: 'รอพิจารณา' },
    { id: 2, title: 'การอนุรักษ์ภาษาถิ่นด้วย AI', researcher: 'นารี สุขสงบ', type: 'ทุนภายนอก', budget: '150000', year: '2567', status: 'อนุมัติ', contract_no: 'URU-2567-001', contract_date: '2567-01-15' },
    { id: 3, title: 'นวัตกรรมการสอนเด็กปฐมวัย', researcher: 'สมชาย ใจดี', type: 'ทุนภายใน', budget: '200000', year: '2567', status: 'ปฏิเสธ' },
  ],
  reports: [
    { id: 1, project: 'AI เพื่อการเกษตรอัจฉริยะ', title: 'รายงานความก้าวหน้า ปีที่ 1', abstract: 'พัฒนาโมเดล ML สำหรับวิเคราะห์คุณภาพดินและพยากรณ์ผลผลิต', date: '2566-06-30', status: 'ส่งแล้ว' },
    { id: 2, project: 'การพัฒนาและอนุรักษ์ภาษาถิ่นเหนือ', title: 'รายงานฉบับสมบูรณ์', abstract: 'รวบรวมคำศัพท์ภาษาถิ่นเหนือกว่า 5,000 คำ พร้อมไฟล์เสียง', date: '2566-09-30', status: 'ส่งแล้ว' },
  ],
};

// Populate local DB once on first run
const ensureInit = async () => {
  const inited = await storage.get('__db_inited');
  if (!inited) {
    await storage.set('researchers', SEED.researchers);
    await storage.set('projects', SEED.projects);
    await storage.set('articles', SEED.articles);
    await storage.set('__next_researcher_id', 4);
    await storage.set('__next_project_id', 4);
    await storage.set('__next_article_id', 4);
    await storage.set('proposals', SEED.proposals);
    await storage.set('reports', SEED.reports);
    await storage.set('__next_proposal_id', 4);
    await storage.set('__next_report_id', 3);
    await storage.set('__db_inited', true);
  }
};

const nextId = async (key: string): Promise<number> => {
  const id = (await storage.get(key)) || 1;
  await storage.set(key, id + 1);
  return id;
};

// Fetch with a hard timeout so offline detection is fast
const fetchT = async (url: string, options?: RequestInit, ms = 3000): Promise<Response> => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const requestedMethod = (options?.method || 'GET').toUpperCase();
    const needsOverride = ['PUT', 'PATCH', 'DELETE'].includes(requestedMethod);
    const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
    let body = options?.body;
    if (needsOverride && !isFormData) {
      try {
        const parsed = typeof body === 'string' && body ? JSON.parse(body) : {};
        body = JSON.stringify({ ...parsed, _method: requestedMethod });
      } catch {
        body = JSON.stringify({ _method: requestedMethod });
      }
    }
    const headers = {
      ...(options?.headers || {}),
      ...(needsOverride ? { 'X-HTTP-Method-Override': requestedMethod } : {}),
    };
    const res = await fetch(url, {
      ...options,
      method: needsOverride ? 'POST' : requestedMethod,
      headers,
      body,
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (res.status === 401) {
      _unauthorizedHandler?.();
      throw new ApiError(401, 'กรุณาเข้าสู่ระบบอีกครั้ง');
    }
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const data = await res.clone().json();
        const firstError = Object.values(data?.errors || {}).flat()[0];
        message = String(firstError || data?.message || message);
      } catch {}
      throw new ApiError(res.status, message);
    }
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
};

// Token helpers
const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return localStorage.getItem('token');
  const { default: AS } = await import('@react-native-async-storage/async-storage');
  return AS.getItem('token');
};

const setToken = async (token: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem('token', token);
  } else {
    const { default: AS } = await import('@react-native-async-storage/async-storage');
    await AS.setItem('token', token);
  }
};

const removeToken = async () => {
  if (Platform.OS === 'web') {
    localStorage.removeItem('token');
  } else {
    const { default: AS } = await import('@react-native-async-storage/async-storage');
    await AS.removeItem('token');
  }
};

// Full session wipe — used by auto-logout handler
export const clearSession = async () => {
  await storage.remove('token');
  await storage.remove('user_profile');
};

// Returns true if backend is reachable right now (2 s timeout)
export const checkBackendOnline = async (): Promise<boolean> => {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(`${BASE_URL}/ping`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
};

const authHeaders = async () => {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

const authOnlyHeaders = async () => {
  const token = await getToken();
  return {
    Accept: 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

const extractList = (json: any): any[] => {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.data?.data)) return json.data.data;
  if (Array.isArray(json?.items)) return json.items;
  return [];
};

const normalizeReference = (item: any) => ({
  ...item,
  id: item.id ?? item.value,
  name: item.name ?? item.name_th ?? item.label ?? item.title ?? String(item.id ?? item.value ?? ''),
});

const normalizeResearch = (item: any) => ({
  ...item,
  id: item.id ?? item.research_id,
  title: item.title ?? item.research_name_th ?? item.name_th ?? item.name ?? '',
  researcher: item.researcher ?? item.owner_name ?? item.owner?.name ?? item.owner_user?.name ?? item.created_by?.name ?? item.profile?.name ?? item.user?.name ?? '',
  owner_user_id: item.owner_user_id ?? item.owner_id ?? item.user_id ?? item.created_by_user_id ?? item.owner?.id ?? item.owner_user?.id ?? item.created_by?.id,
  owner_email: item.owner_email ?? item.owner?.email ?? item.owner_user?.email ?? item.created_by?.email,
  budget: item.budget ?? item.research_budget ?? item.amount ?? '',
  year: item.year ?? item.budget_year ?? item.research_year ?? '',
  status: item.status ?? item.status_name ?? '',
});

// The researches API uses `name` and requires a research type, while the UI
// keeps the friendlier `title` field used throughout the app.
const toResearchPayload = (data: any) => ({
  ...data,
  name: data.name ?? data.title,
  research_type_id: Number(data.research_type_id || 1),
});

const normalizeJournal = (item: any) => ({
  ...item,
  id: item.id ?? item.journal_id,
  title: item.title ?? item.article_name_th ?? item.journal_name_th ?? item.name ?? '',
  author: item.author ?? item.owner_name ?? item.owner?.name ?? item.owner_user?.name ?? item.created_by?.name ?? item.profile?.name ?? item.user?.name ?? '',
  owner_user_id: item.owner_user_id ?? item.owner_id ?? item.user_id ?? item.created_by_user_id ?? item.owner?.id ?? item.owner_user?.id ?? item.created_by?.id,
  owner_email: item.owner_email ?? item.owner?.email ?? item.owner_user?.email ?? item.created_by?.email,
  journal: item.journal ?? item.journal_name ?? item.publisher ?? '',
  year: item.year ?? item.publish_year ?? '',
  status: item.status ?? item.status_name ?? '',
  cited: item.cited ?? item.citation_count ?? 0,
});

const toJournalPayload = (data: any) => ({
  ...data,
  name: data.name ?? data.title,
  journal_type_id: Number(data.journal_type_id || 1),
  publication_year: data.publication_year ?? data.year,
  citation_count: Number(data.citation_count ?? data.cited ?? 0),
});

const normalizeOwnedRecord = (item: any) => ({
  ...item,
  researcher: item.researcher ?? item.owner_name ?? item.owner?.name ?? item.owner_user?.name ?? item.created_by?.name ?? item.user?.name ?? '',
  owner_user_id: item.owner_user_id ?? item.owner_id ?? item.user_id ?? item.created_by_user_id ?? item.owner?.id ?? item.owner_user?.id ?? item.created_by?.id,
  owner_email: item.owner_email ?? item.owner?.email ?? item.owner_user?.email ?? item.created_by?.email,
});

const PROPOSAL_STATUS_TO_SERVER: Record<string, string> = {
  'รอพิจารณา': 'submitted',
  'อนุมัติ': 'approved',
  'ปฏิเสธ': 'rejected',
  'ร่าง': 'draft',
};

const PROPOSAL_STATUS_FROM_SERVER: Record<string, string> = {
  draft: 'รอพิจารณา',
  submitted: 'รอพิจารณา',
  approved: 'อนุมัติ',
  rejected: 'ปฏิเสธ',
};

const REPORT_STATUS_TO_SERVER: Record<string, string> = {
  'ร่างรายงาน': 'draft',
  'ส่งแล้ว': 'submitted',
  'แก้ไข': 'revision_requested',
  'ผ่านการตรวจ': 'approved',
};

const REPORT_STATUS_FROM_SERVER: Record<string, string> = {
  draft: 'ร่างรายงาน',
  submitted: 'ส่งแล้ว',
  revision_requested: 'แก้ไข',
  approved: 'ผ่านการตรวจ',
};

const normalizeProposal = (item: any) => {
  const record = normalizeOwnedRecord(item);
  return {
    ...record,
    title: record.title ?? record.name ?? '',
    type: record.type ?? record.proposal_type ?? '',
    status: PROPOSAL_STATUS_FROM_SERVER[record.status] ?? record.status ?? '',
    budget: record.budget ?? record.amount ?? '',
    year: record.year ?? record.fiscal_year ?? '',
  };
};

const normalizeReport = (item: any) => {
  const record = normalizeOwnedRecord(item);
  return {
    ...record,
    project: record.project ?? record.proposal?.title ?? record.proposal_title ?? '',
    abstract: record.abstract ?? record.content ?? '',
    status: REPORT_STATUS_FROM_SERVER[record.status] ?? record.status ?? '',
  };
};

const toProposalPayload = (data: any) => ({
  ...data,
  summary: data.summary ?? data.abstract ?? data.detail ?? '',
  budget: data.budget === '' || data.budget == null ? undefined : Number(data.budget),
  status: PROPOSAL_STATUS_TO_SERVER[data.status] ?? data.status,
});

const toReportPayload = (data: any) => ({
  ...data,
  content: data.content ?? data.abstract ?? '',
  status: REPORT_STATUS_TO_SERVER[data.status] ?? data.status,
});

const normalizeProfile = (item: any) => {
  const account = item?.user ?? item?.account ?? {};
  const details = item?.profile ?? {};
  // `/me` may return account and profile as separate objects. Keep the account
  // id/role so ownership checks can match `owner_user_id` reliably.
  const profile = { ...account, ...(item ?? {}), ...details };
  const firstName = profile.firstName ?? profile.first_name ?? profile.firstname ?? '';
  const lastName = profile.lastName ?? profile.last_name ?? profile.lastname ?? '';
  return {
    ...profile,
    id: account.id ?? item?.id ?? item?.user_id ?? profile.id,
    name: details.name ?? details.full_name ?? account.name ?? profile.name ?? [firstName, lastName].filter(Boolean).join(' '),
    email: details.email ?? account.email ?? profile.email ?? '',
    faculty: profile.faculty ?? profile.main_unit_name ?? profile.department_name ?? '',
    major: profile.major ?? profile.sub_unit_name ?? '',
    position: profile.position ?? profile.position_name ?? '',
    phone: profile.phone ?? profile.mobile ?? profile.tel ?? '',
    role: (account.role ?? item?.role ?? profile.role) === 'admin' ? 'admin' : 'user',
    avatar: profile.avatar ?? profile.photo_url ?? profile.avatar_url ?? '',
    photo_url: profile.photo_url ?? profile.avatar_url ?? profile.avatar ?? '',
    createdAt: profile.createdAt ?? profile.created_at,
    created_at: profile.created_at ?? profile.createdAt,
    firstName,
    lastName,
  };
};

export const api = {
  getResearchTypes: async (): Promise<any[]> => {
    const res = await fetchT(`${BASE_URL}/ref/research-types`, { headers: await authHeaders() });
    return extractList(await res.json()).map(normalizeReference);
  },

  getJournalTypes: async (): Promise<any[]> => {
    const res = await fetchT(`${BASE_URL}/ref/journal-types`, { headers: await authHeaders() });
    return extractList(await res.json()).map(normalizeReference);
  },

  getMainUnits: async (): Promise<any[]> => {
    const res = await fetchT(`${BASE_URL}/main-units`, { headers: await authHeaders() });
    return extractList(await res.json()).map(normalizeReference);
  },

  getSubUnits: async (): Promise<any[]> => {
    const res = await fetchT(`${BASE_URL}/sub-units`, { headers: await authHeaders() });
    return extractList(await res.json()).map(normalizeReference);
  },

  getProfileOptions: async (): Promise<{ main_units: any[]; sub_units: any[] }> => {
    const res = await fetchT(`${BASE_URL}/ref/profile-options`, { headers: await authHeaders() });
    const json = await res.json();
    return {
      main_units: (json.main_units ?? json.data?.main_units ?? []).map(normalizeReference),
      sub_units: (json.sub_units ?? json.data?.sub_units ?? []).map(normalizeReference),
    };
  },

  getNotifications: async (): Promise<any[] | null> => {
    try {
      const res = await fetchT(`${BASE_URL}/notifications?per_page=100`, { headers: await authHeaders() });
      const json = await res.json();
      if (json?.fallback === true) return null;
      return extractList(json);
    } catch {
      return null;
    }
  },

  markNotificationRead: async (id: string | number): Promise<void> => {
    await fetchT(`${BASE_URL}/notifications/${id}/read`, { method: 'PATCH', headers: await authHeaders() });
  },

  markAllNotificationsRead: async (): Promise<void> => {
    await fetchT(`${BASE_URL}/notifications/read-all`, { method: 'POST', headers: await authHeaders() });
  },

  deleteNotification: async (id: string | number): Promise<void> => {
    await fetchT(`${BASE_URL}/notifications/${id}`, { method: 'DELETE', headers: await authHeaders() });
  },

  uploadProfilePhoto: async (uri: string, name = 'avatar.jpg', mime = 'image/jpeg'): Promise<string> => {
    const form = new FormData();
    if (Platform.OS === 'web') {
      const blob = await (await fetch(uri)).blob();
      form.append('photo', blob, name);
    } else {
      form.append('photo', { uri: uri.split('?')[0], name, type: mime } as any);
    }
    const res = await fetchT(`${BASE_URL}/me/photo`, {
      method: 'POST', headers: await authOnlyHeaders(), body: form,
    }, 30000);
    const json = await res.json();
    return json.photo_url ?? json.avatar_url ?? json.url ?? json.data?.photo_url ?? uri;
  },

  deleteProfilePhoto: async (): Promise<void> => {
    await fetchT(`${BASE_URL}/me/photo`, { method: 'DELETE', headers: await authHeaders() });
  },

  // ── Auth ────────────────────────────────────────────────────────────────
  login: async (email: string, password: string) => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      const token = data.token || data.access_token || data.data?.token || data.data?.access_token;
      const rawUser = data.user || data.profile || data.data?.user || data.data?.profile;
      const user = rawUser ? normalizeProfile(rawUser) : undefined;
      if (token) {
        await setToken(token);
        await ensureInit();
      }
      return token ? { ...data, token, user } : data;
    } catch {
      return { message: 'ไม่สามารถเชื่อมต่อ URU Smart Server ได้' };
    }
  },

  logout: async () => {
    try {
      const headers = await authHeaders();
      await fetchT(`${BASE_URL}/auth/logout`, { method: 'POST', headers });
    } catch {}
    await removeToken();
  },

  // ── Projects ─────────────────────────────────────────────────────────────
  getProjects: async (scope: 'mine' | 'all' = 'all'): Promise<any[]> => {
    try {
      const res = await fetchT(`${BASE_URL}/researches?scope=${scope}&per_page=100`, { headers: await authHeaders() });
      const json = await res.json();
      return extractList(json).map(item => ({ ...normalizeResearch(item), ...(scope === 'mine' ? { is_owner: true } : {}) }));
    } catch {
      return (await storage.get('projects')) || [];
    }
  },

  createProject: async (data: any): Promise<any> => {
    try {
      const res = await fetchT(`${BASE_URL}/researches`, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(toResearchPayload(data)) });
      const json = await res.json();
      const item = normalizeResearch(json.data ?? json);
      return { ...item, researcher: item.researcher || data.researcher };
    } catch (error) {
      rethrowServerError(error);
      const list = (await storage.get('projects')) || [];
      const item = { id: await nextId('__next_project_id'), ...data };
      await storage.set('projects', [...list, item]);
      return item;
    }
  },

  updateProject: async (id: number, data: any): Promise<any> => {
    try {
      const res = await fetchT(`${BASE_URL}/researches/${id}`, { method: 'PUT', headers: await authHeaders(), body: JSON.stringify(toResearchPayload(data)) });
      const json = await res.json();
      return normalizeResearch(json.data ?? json);
    } catch (error) {
      rethrowServerError(error);
      const list: any[] = (await storage.get('projects')) || [];
      const updated = list.map(p => p.id === id ? { ...p, ...data } : p);
      await storage.set('projects', updated);
      return updated.find(p => p.id === id);
    }
  },

  deleteProject: async (id: number): Promise<void> => {
    try {
      await fetchT(`${BASE_URL}/researches/${id}`, { method: 'DELETE', headers: await authHeaders() });
      return;
    } catch (error) { rethrowServerError(error); }
    const list: any[] = (await storage.get('projects')) || [];
    await storage.set('projects', list.filter(p => p.id !== id));
  },

  // ── Articles ──────────────────────────────────────────────────────────────
  getArticles: async (scope: 'mine' | 'all' = 'all'): Promise<any[]> => {
    try {
      const res = await fetchT(`${BASE_URL}/journals?scope=${scope}&per_page=100`, { headers: await authHeaders() });
      const json = await res.json();
      return extractList(json).map(item => ({ ...normalizeJournal(item), ...(scope === 'mine' ? { is_owner: true } : {}) }));
    } catch {
      return (await storage.get('articles')) || [];
    }
  },

  createArticle: async (data: any): Promise<any> => {
    try {
      const res = await fetchT(`${BASE_URL}/journals`, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(toJournalPayload(data)) });
      const json = await res.json();
      return normalizeJournal(json.data ?? json);
    } catch (error) {
      rethrowServerError(error);
      const list = (await storage.get('articles')) || [];
      const item = { id: await nextId('__next_article_id'), ...data };
      await storage.set('articles', [...list, item]);
      return item;
    }
  },

  updateArticle: async (id: number, data: any): Promise<any> => {
    try {
      const res = await fetchT(`${BASE_URL}/journals/${id}`, { method: 'PUT', headers: await authHeaders(), body: JSON.stringify(toJournalPayload(data)) });
      const json = await res.json();
      return normalizeJournal(json.data ?? json);
    } catch (error) {
      rethrowServerError(error);
      const list: any[] = (await storage.get('articles')) || [];
      const updated = list.map(a => a.id === id ? { ...a, ...data } : a);
      await storage.set('articles', updated);
      return updated.find(a => a.id === id);
    }
  },

  deleteArticle: async (id: number): Promise<void> => {
    try {
      await fetchT(`${BASE_URL}/journals/${id}`, { method: 'DELETE', headers: await authHeaders() });
      return;
    } catch (error) { rethrowServerError(error); }
    const list: any[] = (await storage.get('articles')) || [];
    await storage.set('articles', list.filter(a => a.id !== id));
  },

  // ── Researchers ───────────────────────────────────────────────────────────
  getResearchers: async (): Promise<any[]> => {
    try {
      const res = await fetchT(`${BASE_URL}/researchers?per_page=100`, { headers: await authHeaders() });
      const json = await res.json();
      return extractList(json).map(normalizeOwnedRecord);
    } catch {
      return (await storage.get('researchers')) || [];
    }
  },

  createResearcher: async (data: any): Promise<any> => {
    try {
      const res = await fetchT(`${BASE_URL}/researchers`, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(data) });
      const json = await res.json();
      return json.data ?? json;
    } catch (error) {
      rethrowServerError(error);
      const list = (await storage.get('researchers')) || [];
      const item = { id: await nextId('__next_researcher_id'), ...data };
      await storage.set('researchers', [...list, item]);
      return item;
    }
  },

  updateResearcher: async (id: number, data: any): Promise<any> => {
    try {
      const res = await fetchT(`${BASE_URL}/researchers/${id}`, { method: 'PUT', headers: await authHeaders(), body: JSON.stringify(data) });
      const json = await res.json();
      return normalizeOwnedRecord(json.data ?? json);
    } catch (error) {
      rethrowServerError(error);
      const list: any[] = (await storage.get('researchers')) || [];
      const updated = list.map(r => r.id === id ? { ...r, ...data } : r);
      await storage.set('researchers', updated);
      return updated.find(r => r.id === id);
    }
  },

  deleteResearcher: async (id: number): Promise<void> => {
    try {
      await fetchT(`${BASE_URL}/researchers/${id}`, { method: 'DELETE', headers: await authHeaders() });
      return;
    } catch (error) { rethrowServerError(error); }
    const list: any[] = (await storage.get('researchers')) || [];
    await storage.set('researchers', list.filter(r => r.id !== id));
  },

  // ── User Profile ──────────────────────────────────────────────────────────
  getProfile: async (): Promise<any | null> => {
    try {
      const res = await fetchT(`${BASE_URL}/me`, { headers: await authHeaders() });
      const json = await res.json();
      return normalizeProfile(json.data ?? json);
    } catch {
      return (await storage.get('user_profile')) || null;
    }
  },

  updateProfile: async (data: any): Promise<any | null> => {
    try {
      const res = await fetchT(`${BASE_URL}/me`, { method: 'PUT', headers: await authHeaders(), body: JSON.stringify(data) });
      const json = await res.json();
      const current = (await storage.get('user_profile')) || {};
      const profile = normalizeProfile({ ...current, ...(json.data ?? json) });
      await storage.set('user_profile', profile);
      return profile;
    } catch (error) {
      rethrowServerError(error);
    }
    return null;
  },

  changePassword: async (current: string, newPass: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(`${BASE_URL}/password`, {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify({
          current_password: current,
          password: newPass,
          password_confirmation: newPass,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || data.errors?.current_password?.[0] };
      return { success: true };
    } catch {
      return { success: false, message: 'ไม่สามารถเชื่อมต่อ server ได้' };
    }
  },

  // ── Proposals ────────────────────────────────────────────────────────────
  getProposals: async (scope: 'mine' | 'all' = 'all'): Promise<any[]> => {
    try {
      const res = await fetchT(`${BASE_URL}/proposals?scope=${scope}&per_page=100`, { headers: await authHeaders() });
      const json = await res.json();
      return extractList(json).map(item => ({ ...normalizeProposal(item), ...(scope === 'mine' ? { is_owner: true } : {}) }));
    } catch {
      return (await storage.get('proposals')) || [];
    }
  },

  createProposal: async (data: any): Promise<any> => {
    try {
      const res = await fetchT(`${BASE_URL}/proposals`, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(toProposalPayload(data)) });
      const json = await res.json();
      return normalizeProposal(json.data ?? json);
    } catch (error) {
      rethrowServerError(error);
      const list = (await storage.get('proposals')) || [];
      const item = { id: await nextId('__next_proposal_id'), ...data };
      await storage.set('proposals', [...list, item]);
      return item;
    }
  },

  updateProposal: async (id: number, data: any): Promise<any> => {
    try {
      const res = await fetchT(`${BASE_URL}/proposals/${id}`, { method: 'PUT', headers: await authHeaders(), body: JSON.stringify(toProposalPayload(data)) });
      const json = await res.json();
      return normalizeProposal(json.data ?? json);
    } catch (error) {
      rethrowServerError(error);
      const list: any[] = (await storage.get('proposals')) || [];
      const updated = list.map(p => p.id === id ? { ...p, ...data } : p);
      await storage.set('proposals', updated);
      return updated.find(p => p.id === id);
    }
  },

  deleteProposal: async (id: number): Promise<void> => {
    try {
      await fetchT(`${BASE_URL}/proposals/${id}`, { method: 'DELETE', headers: await authHeaders() });
      return;
    } catch (error) { rethrowServerError(error); }
    const list: any[] = (await storage.get('proposals')) || [];
    await storage.set('proposals', list.filter(p => p.id !== id));
  },

  // ── Uploaded Files ────────────────────────────────────────────────────────
  getFiles: async (params?: { entity_type?: 'proposal' | 'report' | 'journal' | string; entity_id?: number | string }): Promise<any[]> => {
    try {
      const query = new URLSearchParams({ per_page: '100' });
      if (params?.entity_type) query.set('entity_type', String(params.entity_type));
      if (params?.entity_id != null) query.set('entity_id', String(params.entity_id));
      const res = await fetchT(`${BASE_URL}/files?${query.toString()}`, { headers: await authHeaders() });
      return extractList(await res.json()).map((file: any) => ({
        ...file,
        name: file.name ?? file.original_name ?? file.file_name ?? '',
        mime: file.mime ?? file.mime_type ?? 'application/octet-stream',
        size: file.size ?? file.file_size ?? 0,
        date: file.date ?? file.created_at?.slice?.(0, 10) ?? '',
        owner: file.owner_name ?? file.owner?.name ?? '',
        uri: file.uri ?? file.download_url ?? `${BASE_URL}/files/${file.id}/download`,
      }));
    } catch (error) {
      rethrowServerError(error);
      return (await storage.get('uploaded_files')) || [];
    }
  },

  addFile: async (data: { name: string; uri: string; mime: string; size: number; date: string; owner: string; entity_type?: string; entity_id?: number | string }): Promise<any> => {
    try {
      const form = new FormData();
      if (Platform.OS === 'web') {
        const blob = await (await fetch(data.uri)).blob();
        form.append('file', blob, data.name);
      } else {
        form.append('file', { uri: data.uri, name: data.name, type: data.mime } as any);
      }
      if (data.entity_type) form.append('entity_type', data.entity_type);
      if (data.entity_id != null) form.append('entity_id', String(data.entity_id));
      const res = await fetchT(`${BASE_URL}/files`, {
        method: 'POST', headers: await authOnlyHeaders(), body: form,
      }, 30000);
      const json = await res.json();
      return json.data ?? json;
    } catch (error) {
      rethrowServerError(error);
    }
    const list = (await storage.get('uploaded_files')) || [];
    const item = { id: await nextId('__next_file_id'), ...data };
    await storage.set('uploaded_files', [...list, item]);
    return item;
  },

  deleteFile: async (id: number): Promise<void> => {
    try {
      await fetchT(`${BASE_URL}/files/${id}`, { method: 'DELETE', headers: await authHeaders() });
      return;
    } catch (error) {
      rethrowServerError(error);
    }
    const list: any[] = (await storage.get('uploaded_files')) || [];
    await storage.set('uploaded_files', list.filter(f => f.id !== id));
  },

  // ── User Management (admin) ──────────────────────────────────────────────
  getUsers: async (): Promise<any[]> => {
    try {
      const res = await fetchT(`${BASE_URL}/admin/users?per_page=100`, { headers: await authHeaders() });
      return extractList(await res.json()).map(normalizeProfile);
    } catch {
      return (await storage.get('all_users')) || [];
    }
  },

  upsertUser: async (u: { email: string; name: string; role: 'admin' | 'user'; faculty?: string; position?: string }): Promise<void> => {
    const list: any[] = (await storage.get('all_users')) || [];
    const idx = list.findIndex(x => x.email === u.email);
    if (idx >= 0) list[idx] = { ...list[idx], ...u };
    else list.push({ ...u, createdAt: new Date().toISOString() });
    await storage.set('all_users', list);
  },

  updateUserRole: async (email: string, role: 'admin' | 'user'): Promise<void> => {
    try {
      const usersRes = await fetchT(`${BASE_URL}/admin/users?per_page=100`, { headers: await authHeaders() });
      const user = extractList(await usersRes.json()).find(u => String(u.email).toLowerCase() === email.toLowerCase());
      if (user?.id != null) {
        await fetchT(`${BASE_URL}/admin/users/${user.id}/role`, { method: 'PATCH', headers: await authHeaders(), body: JSON.stringify({ role }) });
        return;
      }
    } catch {}
    const list: any[] = (await storage.get('all_users')) || [];
    const idx = list.findIndex(x => x.email === email);
    if (idx >= 0) { list[idx].role = role; await storage.set('all_users', list); }
  },

  deleteUser: async (email: string): Promise<void> => {
    try {
      const usersRes = await fetchT(`${BASE_URL}/admin/users?per_page=100`, { headers: await authHeaders() });
      const user = extractList(await usersRes.json()).find(u => String(u.email).toLowerCase() === email.toLowerCase());
      if (user?.id != null) {
        await fetchT(`${BASE_URL}/admin/users/${user.id}`, { method: 'DELETE', headers: await authHeaders() });
        return;
      }
    } catch {}
    const list: any[] = (await storage.get('all_users')) || [];
    await storage.set('all_users', list.filter(x => x.email !== email));
  },

  getUserRole: async (email: string): Promise<'admin' | 'user'> => {
    if (email === 'admin@admin.com') return 'admin';
    const list: any[] = (await storage.get('all_users')) || [];
    return (list.find(x => x.email === email)?.role) || 'user';
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  getReports: async (scope: 'mine' | 'all' = 'all'): Promise<any[]> => {
    try {
      const res = await fetchT(`${BASE_URL}/reports?scope=${scope}&per_page=100`, { headers: await authHeaders() });
      const json = await res.json();
      return extractList(json).map(item => ({ ...normalizeReport(item), ...(scope === 'mine' ? { is_owner: true } : {}) }));
    } catch {
      return (await storage.get('reports')) || [];
    }
  },

  createReport: async (data: any): Promise<any> => {
    try {
      const res = await fetchT(`${BASE_URL}/reports`, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(toReportPayload(data)) });
      const json = await res.json();
      return normalizeReport(json.data ?? json);
    } catch (error) {
      rethrowServerError(error);
      const list = (await storage.get('reports')) || [];
      const item = { id: await nextId('__next_report_id'), ...data };
      await storage.set('reports', [...list, item]);
      return item;
    }
  },

  updateReport: async (id: number, data: any): Promise<any> => {
    try {
      const res = await fetchT(`${BASE_URL}/reports/${id}`, { method: 'PUT', headers: await authHeaders(), body: JSON.stringify(toReportPayload(data)) });
      const json = await res.json();
      return normalizeReport(json.data ?? json);
    } catch (error) {
      rethrowServerError(error);
      const list: any[] = (await storage.get('reports')) || [];
      const updated = list.map(r => r.id === id ? { ...r, ...data } : r);
      await storage.set('reports', updated);
      return updated.find(r => r.id === id);
    }
  },

  deleteReport: async (id: number): Promise<void> => {
    try {
      await fetchT(`${BASE_URL}/reports/${id}`, { method: 'DELETE', headers: await authHeaders() });
      return;
    } catch (error) { rethrowServerError(error); }
    const list: any[] = (await storage.get('reports')) || [];
    await storage.set('reports', list.filter(r => r.id !== id));
  },
};
