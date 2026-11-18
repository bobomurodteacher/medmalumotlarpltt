import * as XLSX from 'xlsx';
import { MedicalWorkerSubmission, AppConfig } from '../types';
import { cyrillicToLatin } from '../utils/transliterate';

const SUBMISSIONS_KEY = 'dmed_submissions_v2';
const LEGACY_BACKUP_KEY = 'dmed_legacy_backup_v2';
const CONFIG_KEY = 'dmed_config_v2';

export const DEFAULT_POSITIONS: string[] = [];
export const DEFAULT_WORKPLACES: string[] = [];

const INITIAL_SUBMISSIONS: MedicalWorkerSubmission[] = [];

// High-speed in-memory cache for instant UI rendering
let cachedSubmissions: MedicalWorkerSubmission[] | null = null;
let cachedConfig: AppConfig | null = null;
let hasBackedUpLegacy = false;

// Active listeners set for app-wide updates
const submissionListeners = new Set<(submissions: MedicalWorkerSubmission[]) => void>();
const configListeners = new Set<(config: AppConfig) => void>();

function notifySubmissionListeners(list: MedicalWorkerSubmission[]) {
  submissionListeners.forEach((listener) => {
    try {
      listener(list);
    } catch (e) {
      console.warn('Listener notification error:', e);
    }
  });
}

function notifyConfigListeners(cfg: AppConfig) {
  configListeners.forEach((listener) => {
    try {
      listener(cfg);
    } catch (e) {
      console.warn('Config listener notification error:', e);
    }
  });
}

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      if (contentType.includes('text/html') || text.trim().startsWith('<')) {
        throw new Error(
          "Server API (/api) topilmadi. Netlify'da loyihani to'liq (Functions bilan) deploy qiling."
        );
      }
      parsed = null;
    }
  }

  if (!response.ok) {
    const errMsg =
      parsed && typeof parsed === 'object' && 'error' in parsed && typeof (parsed as { error?: unknown }).error === 'string'
        ? (parsed as { error: string }).error
        : `Server xatoligi (${response.status})`;
    throw new Error(errMsg);
  }

  return parsed as T;
}

export function loadConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(CONFIG_KEY) : null;
    if (!raw) {
      const initial: AppConfig = {
        adminPassword: 'admin',
        positions: [],
        workplaces: [],
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(initial));
      }
      cachedConfig = initial;
      return initial;
    }
    const parsed = JSON.parse(raw);
    const result: AppConfig = {
      adminPassword: parsed.adminPassword || 'admin',
      positions: Array.isArray(parsed.positions) ? parsed.positions : [],
      workplaces: Array.isArray(parsed.workplaces) ? parsed.workplaces : [],
    };
    cachedConfig = result;
    return result;
  } catch {
    const fallback: AppConfig = {
      adminPassword: 'admin',
      positions: [],
      workplaces: [],
    };
    cachedConfig = fallback;
    return fallback;
  }
}

export function saveConfigLocally(config: AppConfig): void {
  cachedConfig = config;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    }
  } catch (err) {
    console.error('Error saving config locally', err);
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  saveConfigLocally(config);
  notifyConfigListeners(config);

  const saved = await apiRequest<AppConfig>('/api/config', {
    method: 'PUT',
    body: JSON.stringify({
      adminPassword: config.adminPassword || 'admin',
      positions: config.positions || [],
      workplaces: config.workplaces || [],
    }),
  });

  saveConfigLocally(saved);
  notifyConfigListeners(saved);
}

export function loadSubmissions(): MedicalWorkerSubmission[] {
  if (cachedSubmissions) {
    return cachedSubmissions;
  }
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(SUBMISSIONS_KEY) : null;
    if (!raw) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(INITIAL_SUBMISSIONS));
      }
      cachedSubmissions = INITIAL_SUBMISSIONS;
      return INITIAL_SUBMISSIONS;
    }
    cachedSubmissions = JSON.parse(raw);
    return cachedSubmissions || INITIAL_SUBMISSIONS;
  } catch {
    cachedSubmissions = INITIAL_SUBMISSIONS;
    return INITIAL_SUBMISSIONS;
  }
}

export function saveSubmissionsLocally(submissions: MedicalWorkerSubmission[]): void {
  cachedSubmissions = submissions;
  try {
    if (typeof window !== 'undefined') {
      if (!hasBackedUpLegacy) {
        hasBackedUpLegacy = true;
        const existingRaw = localStorage.getItem(SUBMISSIONS_KEY);
        const backupRaw = localStorage.getItem(LEGACY_BACKUP_KEY);
        if (existingRaw && existingRaw !== '[]' && !backupRaw) {
          localStorage.setItem(LEGACY_BACKUP_KEY, existingRaw);
        }
      }
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
    }
  } catch (err) {
    console.error('Error saving submissions locally', err);
  }
}

export function saveSubmissions(submissions: MedicalWorkerSubmission[]): void {
  saveSubmissionsLocally(submissions);
  notifySubmissionListeners(submissions);
}

export function getLegacyBackupSubmissions(): MedicalWorkerSubmission[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(LEGACY_BACKUP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Direct fetch from Neon PostgreSQL submissions table via /api/submissions
 */
export async function fetchAllSubmissionsFromCloud(): Promise<MedicalWorkerSubmission[]> {
  try {
    const list = await apiRequest<MedicalWorkerSubmission[]>('/api/submissions');
    if (Array.isArray(list)) {
      saveSubmissionsLocally(list);
      notifySubmissionListeners(list);
      return list;
    }
  } catch (err) {
    console.warn('Neon fetch submissions warning:', err);
  }
  return loadSubmissions();
}

/**
 * Direct fetch from Neon PostgreSQL config table via /api/config
 */
export async function fetchConfigFromCloud(): Promise<AppConfig> {
  try {
    const data = await apiRequest<AppConfig>('/api/config');
    if (data) {
      const current = loadConfig();
      const merged: AppConfig = {
        adminPassword: data.adminPassword || current.adminPassword || 'admin',
        positions: Array.isArray(data.positions) ? data.positions : current.positions,
        workplaces: Array.isArray(data.workplaces) ? data.workplaces : current.workplaces,
      };
      saveConfigLocally(merged);
      notifyConfigListeners(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Neon fetch config warning:', err);
  }
  return loadConfig();
}

/**
 * Real-time polling subscription for Submissions across all connected devices (Neon PostgreSQL)
 */
export function subscribeToSubmissions(
  onUpdate: (submissions: MedicalWorkerSubmission[]) => void
): () => void {
  submissionListeners.add(onUpdate);

  // 1. Send current cached/local data immediately
  const current = loadSubmissions();
  onUpdate(current);

  // 2. Fetch fresh data from Neon PostgreSQL
  fetchAllSubmissionsFromCloud().then((list) => {
    onUpdate(list);
  });

  // 3. 5-second background polling + tab focus refresh
  const handleFocus = () => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      fetchAllSubmissionsFromCloud();
    }
  };

  const intervalId = setInterval(() => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      fetchAllSubmissionsFromCloud();
    }
  }, 5000);

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);
  }

  return () => {
    submissionListeners.delete(onUpdate);
    clearInterval(intervalId);
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    }
  };
}

/**
 * Subscription for App Config (workplaces, positions, password) from Neon PostgreSQL
 */
export function subscribeToConfig(onUpdate: (config: AppConfig) => void): () => void {
  configListeners.add(onUpdate);

  const current = loadConfig();
  onUpdate(current);

  fetchConfigFromCloud().then((cfg) => {
    onUpdate(cfg);
  });

  const handleFocus = () => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      fetchConfigFromCloud();
    }
  };

  const intervalId = setInterval(() => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      fetchConfigFromCloud();
    }
  }, 15000);

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleFocus);
  }

  return () => {
    configListeners.delete(onUpdate);
    clearInterval(intervalId);
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handleFocus);
    }
  };
}

export async function syncAllSubmissionsToCloud(
  items: MedicalWorkerSubmission[]
): Promise<{ upsertedCount: number; skippedCount: number }> {
  const legacyItems = getLegacyBackupSubmissions();
  const combinedMap = new Map<string, MedicalWorkerSubmission>();

  for (const item of [...legacyItems, ...items]) {
    if (item && item.jshshir) {
      combinedMap.set(item.jshshir, normalizeSubmissionToLatin(item));
    }
  }

  const payload = Array.from(combinedMap.values());
  if (payload.length === 0) {
    return { upsertedCount: 0, skippedCount: 0 };
  }

  const res = await apiRequest<{ upsertedCount: number; skippedCount: number }>(
    '/api/submissions/bulk',
    {
      method: 'POST',
      body: JSON.stringify({ items: payload }),
    }
  );

  await fetchAllSubmissionsFromCloud();
  return res;
}

export async function bulkImportSubmissions(
  items: Partial<MedicalWorkerSubmission>[]
): Promise<{ upsertedCount: number; skippedCount: number }> {
  const normalized = items.map((sub) => ({
    id: sub.id ? String(sub.id).trim() : undefined,
    fullName: cyrillicToLatin(String(sub.fullName || '')).trim(),
    position: cyrillicToLatin(String(sub.position || '')).trim(),
    workplace: cyrillicToLatin(String(sub.workplace || '')).trim(),
    phoneNumber: sub.phoneNumber ? cyrillicToLatin(String(sub.phoneNumber)).trim() : '',
    passport: cyrillicToLatin(String(sub.passport || '')).toUpperCase().trim(),
    jshshir: String(sub.jshshir || '').replace(/\D/g, '').trim(),
    createdAt: sub.createdAt,
  }));

  const res = await apiRequest<{ upsertedCount: number; skippedCount: number }>(
    '/api/submissions/bulk',
    {
      method: 'POST',
      body: JSON.stringify({ items: normalized }),
    }
  );

  await fetchAllSubmissionsFromCloud();
  return res;
}

export async function forceSyncFromCloud(): Promise<{
  submissions: MedicalWorkerSubmission[];
  config: AppConfig;
}> {
  const [cfg, subs] = await Promise.all([
    apiRequest<AppConfig>('/api/config'),
    apiRequest<MedicalWorkerSubmission[]>('/api/submissions'),
  ]);

  const normalizedCfg: AppConfig = {
    adminPassword: cfg.adminPassword || 'admin',
    positions: Array.isArray(cfg.positions) ? cfg.positions : [],
    workplaces: Array.isArray(cfg.workplaces) ? cfg.workplaces : [],
  };

  saveConfigLocally(normalizedCfg);
  notifyConfigListeners(normalizedCfg);

  const normalizedSubs = Array.isArray(subs) ? subs : [];
  saveSubmissionsLocally(normalizedSubs);
  notifySubmissionListeners(normalizedSubs);

  return { submissions: normalizedSubs, config: normalizedCfg };
}

export function normalizeSubmissionToLatin(sub: MedicalWorkerSubmission): MedicalWorkerSubmission {
  return {
    ...sub,
    fullName: cyrillicToLatin(sub.fullName).trim(),
    position: cyrillicToLatin(sub.position).trim(),
    workplace: cyrillicToLatin(sub.workplace).trim(),
    phoneNumber: sub.phoneNumber ? cyrillicToLatin(sub.phoneNumber).trim() : undefined,
    passport: cyrillicToLatin(sub.passport).toUpperCase().trim(),
    jshshir: sub.jshshir.trim(),
  };
}

export async function addSubmission(
  data: Omit<MedicalWorkerSubmission, 'id' | 'createdAt'>
): Promise<MedicalWorkerSubmission> {
  const payload = {
    fullName: cyrillicToLatin(data.fullName).trim(),
    position: cyrillicToLatin(data.position).trim(),
    workplace: cyrillicToLatin(data.workplace).trim(),
    phoneNumber: data.phoneNumber ? cyrillicToLatin(data.phoneNumber).trim() : '',
    passport: cyrillicToLatin(data.passport).toUpperCase().trim(),
    jshshir: data.jshshir.trim(),
  };

  const created = await apiRequest<MedicalWorkerSubmission>('/api/submissions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const current = loadSubmissions();
  const updated = [created, ...current.filter((item) => item.id !== created.id && item.jshshir !== created.jshshir)];
  saveSubmissions(updated);

  return created;
}

export async function updateSubmission(
  id: string,
  updatedFields: Partial<MedicalWorkerSubmission>
): Promise<MedicalWorkerSubmission[]> {
  const normalizedFields: Partial<MedicalWorkerSubmission> = { ...updatedFields };
  if (normalizedFields.fullName) normalizedFields.fullName = cyrillicToLatin(normalizedFields.fullName).trim();
  if (normalizedFields.position) normalizedFields.position = cyrillicToLatin(normalizedFields.position).trim();
  if (normalizedFields.workplace) normalizedFields.workplace = cyrillicToLatin(normalizedFields.workplace).trim();
  if (normalizedFields.phoneNumber !== undefined) {
    normalizedFields.phoneNumber = cyrillicToLatin(normalizedFields.phoneNumber || '').trim();
  }
  if (normalizedFields.passport) {
    normalizedFields.passport = cyrillicToLatin(normalizedFields.passport).toUpperCase().trim();
  }

  const savedRow = await apiRequest<MedicalWorkerSubmission>(
    `/api/submissions/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(normalizedFields),
    }
  );

  const current = loadSubmissions();
  const updated = current.map((item) => (item.id === id ? savedRow : item));
  saveSubmissions(updated);
  return updated;
}

export async function deleteSubmission(id: string): Promise<MedicalWorkerSubmission[]> {
  await apiRequest<{ ok: boolean }>(`/api/submissions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  const current = loadSubmissions();
  const updated = current.filter((item) => item.id !== id);
  saveSubmissions(updated);
  return updated;
}

export async function deleteMultipleSubmissions(ids: string[]): Promise<MedicalWorkerSubmission[]> {
  await apiRequest<{ ok: boolean }>('/api/submissions/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });

  const current = loadSubmissions();
  const idSet = new Set(ids);
  const updated = current.filter((item) => !idSet.has(item.id));
  saveSubmissions(updated);
  return updated;
}

export function isJshshirRegistered(jshshir: string, excludeId?: string): boolean {
  const current = loadSubmissions();
  const clean = jshshir.trim();
  return current.some((item) => item.jshshir === clean && (!excludeId || item.id !== excludeId));
}

export async function parseSubmissionsFromSpreadsheetFile(
  file: File
): Promise<{
  items: Partial<MedicalWorkerSubmission>[];
  positions: string[];
  workplaces: string[];
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Fayl ichida jadval topilmadi.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const items: Partial<MedicalWorkerSubmission>[] = [];
  const positionSet = new Set<string>();
  const workplaceSet = new Set<string>();

  const pickField = (row: Record<string, unknown>, candidates: string[]): string => {
    const entries = Object.entries(row);
    for (const candidate of candidates) {
      const target = candidate.toLowerCase();
      for (const [k, v] of entries) {
        if (k.trim().toLowerCase() === target && v !== undefined && v !== null && String(v).trim() !== '') {
          return String(v).trim();
        }
      }
    }
    return '';
  };

  for (const row of rawRows) {
    const fullName = cyrillicToLatin(
      pickField(row, ['Familya Ismi', 'fullName', 'fullname', 'full_name', 'F.I.O', 'Ism Familya'])
    ).trim();
    const position = cyrillicToLatin(
      pickField(row, ['Lavozimi', 'Lavozim', 'position'])
    ).trim();
    const workplace = cyrillicToLatin(
      pickField(row, ['Ish joyi', 'workplace'])
    ).trim();
    const phoneNumber = cyrillicToLatin(
      pickField(row, ['Telefon Raqami', 'Telefon', 'phoneNumber', 'phonenumber', 'phone'])
    ).trim();
    const passport = cyrillicToLatin(
      pickField(row, ['Passport seriya va raqam', 'Passport', 'passport'])
    )
      .toUpperCase()
      .trim();
    const jshshir = pickField(row, ['JSHSHIR (14 raqam)', 'JSHSHIR', 'jshshir']).replace(/\D/g, '').trim();
    const id = pickField(row, ['ID', 'id']);
    const createdAtRaw = pickField(row, ['Yuborilgan vaqt', 'Sana', 'createdAt', 'createdat', 'created_at']);

    if (!fullName || !position || !workplace || !passport || jshshir.length !== 14) {
      continue;
    }

    positionSet.add(position);
    workplaceSet.add(workplace);

    let createdAt: string | undefined;
    if (createdAtRaw) {
      const parsedDate = new Date(createdAtRaw);
      if (!Number.isNaN(parsedDate.getTime())) {
        createdAt = parsedDate.toISOString();
      }
    }

    items.push({
      id: id || undefined,
      fullName,
      position,
      workplace,
      phoneNumber,
      passport,
      jshshir,
      createdAt,
    });
  }

  return {
    items,
    positions: Array.from(positionSet),
    workplaces: Array.from(workplaceSet),
  };
}

export function exportToExcel(submissions: MedicalWorkerSubmission[], filename = 'Tibbiyot_Xodimlari'): void {
  const rows = submissions.map((sub, idx) => ({
    "№": idx + 1,
    "ID": sub.id,
    "Familya Ismi": sub.fullName,
    "Lavozimi": sub.position,
    "Ish joyi": sub.workplace,
    "Telefon Raqami": sub.phoneNumber || "-",
    "Passport seriya va raqam": sub.passport,
    "JSHSHIR (14 raqam)": sub.jshshir,
    "Yuborilgan vaqt": new Date(sub.createdAt || Date.now()).toLocaleString('uz-UZ')
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 32 },
    { wch: 28 },
    { wch: 35 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Xodimlar");
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}_${dateStr}.xlsx`);
}

export function exportToCSV(submissions: MedicalWorkerSubmission[], filename = 'Tibbiyot_Xodimlari'): void {
  const headers = [
    "№",
    "ID",
    "Familya Ismi",
    "Lavozim",
    "Ish joyi",
    "Telefon",
    "Passport",
    "JSHSHIR",
    "Sana"
  ];

  const rows = submissions.map((sub, idx) => [
    idx + 1,
    `"${sub.id}"`,
    `"${sub.fullName.replace(/"/g, '""')}"`,
    `"${sub.position.replace(/"/g, '""')}"`,
    `"${sub.workplace.replace(/"/g, '""')}"`,
    `"${sub.phoneNumber || ''}"`,
    `"${sub.passport}"`,
    `"${sub.jshshir}"`,
    `"${new Date(sub.createdAt || Date.now()).toLocaleString('uz-UZ')}"`
  ]);

  const csvContent = "\uFEFF" + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `${filename}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
