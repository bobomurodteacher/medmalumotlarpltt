import { neon } from '@neondatabase/serverless';

export interface MedicalWorkerSubmissionRecord {
  id: string;
  fullName: string;
  position: string;
  workplace: string;
  phoneNumber?: string;
  passport: string;
  jshshir: string;
  createdAt: string;
}

export interface AppConfigRecord {
  adminPassword: string;
  positions: string[];
  workplaces: string[];
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const FALLBACK_URL =
  'postgresql://neondb_owner:npg_UnLvS9hBfwD7@ep-bitter-pine-be41fsty-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || FALLBACK_URL;
  if (!url) {
    throw new HttpError(500, 'DATABASE_URL muhit o‘zgaruvchisi sozlanmagan');
  }
  return url;
}

function getSql() {
  return neon(getDatabaseUrl());
}

let schemaInitPromise: Promise<void> | null = null;

export async function ensureSchema(): Promise<void> {
  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS submissions (
          id TEXT PRIMARY KEY,
          "fullName" TEXT NOT NULL,
          position TEXT NOT NULL,
          workplace TEXT NOT NULL,
          "phoneNumber" TEXT,
          passport TEXT NOT NULL,
          jshshir TEXT NOT NULL UNIQUE,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_submissions_created_at
        ON submissions ("createdAt" DESC)
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS config (
          id TEXT PRIMARY KEY,
          "adminPassword" TEXT NOT NULL DEFAULT 'admin',
          positions JSONB NOT NULL DEFAULT '[]'::jsonb,
          workplaces JSONB NOT NULL DEFAULT '[]'::jsonb,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        INSERT INTO config (id, "adminPassword", positions, workplaces)
        VALUES ('main', 'admin', '[]'::jsonb, '[]'::jsonb)
        ON CONFLICT (id) DO NOTHING
      `;
    })().catch((err) => {
      schemaInitPromise = null;
      throw err;
    });
  }
  return schemaInitPromise;
}

function generateUniqueId(): string {
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `ID-${randomDigits}`;
}

function normalizeIsoDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
}

function mapSubmissionRow(row: Record<string, unknown>): MedicalWorkerSubmissionRecord {
  return {
    id: String(row.id || ''),
    fullName: String(row.fullName || ''),
    position: String(row.position || ''),
    workplace: String(row.workplace || ''),
    phoneNumber: row.phoneNumber ? String(row.phoneNumber) : '',
    passport: String(row.passport || ''),
    jshshir: String(row.jshshir || ''),
    createdAt: normalizeIsoDate(row.createdAt),
  };
}

export async function checkHealth(): Promise<{
  ok: boolean;
  database: string;
  submissionsCount: number;
  positionsCount: number;
  workplacesCount: number;
}> {
  await ensureSchema();
  const sql = getSql();
  const [subCountRow] = await sql`SELECT COUNT(*)::int AS count FROM submissions`;
  const config = await getConfig();
  return {
    ok: true,
    database: 'neon-postgresql',
    submissionsCount: Number(subCountRow?.count || 0),
    positionsCount: config.positions.length,
    workplacesCount: config.workplaces.length,
  };
}

export async function getSubmissions(): Promise<MedicalWorkerSubmissionRecord[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT id, "fullName", position, workplace, "phoneNumber", passport, jshshir, "createdAt"
    FROM submissions
    ORDER BY "createdAt" DESC
    LIMIT 10000
  `;
  return rows.map((r) => mapSubmissionRow(r as Record<string, unknown>));
}

export async function createSubmission(
  input: Omit<MedicalWorkerSubmissionRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
): Promise<MedicalWorkerSubmissionRecord> {
  await ensureSchema();
  const sql = getSql();

  const jshshir = String(input.jshshir || '').trim();
  const fullName = String(input.fullName || '').trim();
  const position = String(input.position || '').trim();
  const workplace = String(input.workplace || '').trim();
  const phoneNumber = String(input.phoneNumber || '').trim();
  const passport = String(input.passport || '').trim().toUpperCase();

  if (!fullName || !position || !workplace || !passport || jshshir.length !== 14) {
    throw new HttpError(400, "Barcha majburiy maydonlar to'g'ri to'ldirilishi shart.");
  }

  const existingByJshshir = await sql`
    SELECT id FROM submissions WHERE jshshir = ${jshshir} LIMIT 1
  `;
  if (existingByJshshir.length > 0) {
    throw new HttpError(
      409,
      "Ushbu JSHSHIR raqami bilan xodim allaqachon ro'yxatdan o'tgan! Qayta yuborish mumkin emas."
    );
  }

  let candidateId = (input.id || '').trim() || generateUniqueId();
  const createdAt = normalizeIsoDate(input.createdAt);

  for (let attempt = 0; attempt < 3; attempt++) {
    const existingById = await sql`SELECT id FROM submissions WHERE id = ${candidateId} LIMIT 1`;
    if (existingById.length === 0) break;
    candidateId = generateUniqueId();
  }

  try {
    const rows = await sql`
      INSERT INTO submissions (id, "fullName", position, workplace, "phoneNumber", passport, jshshir, "createdAt")
      VALUES (${candidateId}, ${fullName}, ${position}, ${workplace}, ${phoneNumber}, ${passport}, ${jshshir}, ${createdAt}::timestamptz)
      RETURNING id, "fullName", position, workplace, "phoneNumber", passport, jshshir, "createdAt"
    `;
    return mapSubmissionRow(rows[0] as Record<string, unknown>);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('jshshir')) {
      throw new HttpError(
        409,
        "Ushbu JSHSHIR raqami bilan xodim allaqachon ro'yxatdan o'tgan! Qayta yuborish mumkin emas."
      );
    }
    throw err;
  }
}

export async function bulkUpsertSubmissions(
  items: Partial<MedicalWorkerSubmissionRecord>[]
): Promise<{ upsertedCount: number; skippedCount: number }> {
  await ensureSchema();
  const sql = getSql();

  let upsertedCount = 0;
  let skippedCount = 0;

  for (const raw of items) {
    const jshshir = String(raw.jshshir || '').replace(/\D/g, '').trim();
    const fullName = String(raw.fullName || '').trim();
    const position = String(raw.position || '').trim();
    const workplace = String(raw.workplace || '').trim();
    const phoneNumber = String(raw.phoneNumber || '').trim();
    const passport = String(raw.passport || '').trim().toUpperCase();

    if (!fullName || !position || !workplace || !passport || jshshir.length !== 14) {
      skippedCount++;
      continue;
    }

    let id = String(raw.id || '').trim() || generateUniqueId();
    const createdAt = normalizeIsoDate(raw.createdAt);

    // Ensure id doesn't collide with a DIFFERENT jshshir row
    const idCheck = await sql`SELECT jshshir FROM submissions WHERE id = ${id} LIMIT 1`;
    if (idCheck.length > 0 && idCheck[0].jshshir !== jshshir) {
      id = generateUniqueId();
    }

    await sql`
      INSERT INTO submissions (id, "fullName", position, workplace, "phoneNumber", passport, jshshir, "createdAt")
      VALUES (${id}, ${fullName}, ${position}, ${workplace}, ${phoneNumber}, ${passport}, ${jshshir}, ${createdAt}::timestamptz)
      ON CONFLICT (jshshir) DO UPDATE SET
        "fullName" = EXCLUDED."fullName",
        position = EXCLUDED.position,
        workplace = EXCLUDED.workplace,
        "phoneNumber" = COALESCE(NULLIF(EXCLUDED."phoneNumber", ''), submissions."phoneNumber"),
        passport = EXCLUDED.passport
    `;
    upsertedCount++;
  }

  return { upsertedCount, skippedCount };
}

export async function updateSubmission(
  id: string,
  fields: Partial<MedicalWorkerSubmissionRecord>
): Promise<MedicalWorkerSubmissionRecord> {
  await ensureSchema();
  const sql = getSql();

  const existingRows = await sql`
    SELECT id, "fullName", position, workplace, "phoneNumber", passport, jshshir, "createdAt"
    FROM submissions
    WHERE id = ${id}
    LIMIT 1
  `;
  if (existingRows.length === 0) {
    throw new HttpError(404, "Tahrirlanayotgan xodim bazadan topilmadi.");
  }

  const current = mapSubmissionRow(existingRows[0] as Record<string, unknown>);
  const nextFullName = fields.fullName !== undefined ? String(fields.fullName).trim() : current.fullName;
  const nextPosition = fields.position !== undefined ? String(fields.position).trim() : current.position;
  const nextWorkplace = fields.workplace !== undefined ? String(fields.workplace).trim() : current.workplace;
  const nextPhone = fields.phoneNumber !== undefined ? String(fields.phoneNumber || '').trim() : (current.phoneNumber || '');
  const nextPassport = fields.passport !== undefined ? String(fields.passport).trim().toUpperCase() : current.passport;
  const nextJshshir = fields.jshshir !== undefined ? String(fields.jshshir).replace(/\D/g, '').trim() : current.jshshir;

  if (nextJshshir !== current.jshshir) {
    const dup = await sql`SELECT id FROM submissions WHERE jshshir = ${nextJshshir} AND id <> ${id} LIMIT 1`;
    if (dup.length > 0) {
      throw new HttpError(409, "Bunday JSHSHIR raqamli boshqa xodim mavjud!");
    }
  }

  const updated = await sql`
    UPDATE submissions
    SET
      "fullName" = ${nextFullName},
      position = ${nextPosition},
      workplace = ${nextWorkplace},
      "phoneNumber" = ${nextPhone},
      passport = ${nextPassport},
      jshshir = ${nextJshshir}
    WHERE id = ${id}
    RETURNING id, "fullName", position, workplace, "phoneNumber", passport, jshshir, "createdAt"
  `;

  return mapSubmissionRow(updated[0] as Record<string, unknown>);
}

export async function deleteSubmission(id: string): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`DELETE FROM submissions WHERE id = ${id}`;
}

export async function deleteMultipleSubmissions(ids: string[]): Promise<void> {
  await ensureSchema();
  if (!ids || ids.length === 0) return;
  const sql = getSql();
  await sql`DELETE FROM submissions WHERE id = ANY(${ids}::text[])`;
}

export async function getConfig(): Promise<AppConfigRecord> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT "adminPassword", positions, workplaces
    FROM config
    WHERE id = 'main'
    LIMIT 1
  `;

  if (rows.length === 0) {
    return { adminPassword: 'admin', positions: [], workplaces: [] };
  }

  const row = rows[0];
  return {
    adminPassword: String(row.adminPassword || 'admin'),
    positions: Array.isArray(row.positions) ? row.positions.map(String) : [],
    workplaces: Array.isArray(row.workplaces) ? row.workplaces.map(String) : [],
  };
}

export async function saveConfig(cfg: Partial<AppConfigRecord>): Promise<AppConfigRecord> {
  await ensureSchema();
  const sql = getSql();
  const current = await getConfig();

  const nextPassword = cfg.adminPassword !== undefined ? String(cfg.adminPassword || 'admin') : current.adminPassword;
  const nextPositions = Array.isArray(cfg.positions) ? cfg.positions : current.positions;
  const nextWorkplaces = Array.isArray(cfg.workplaces) ? cfg.workplaces : current.workplaces;

  await sql`
    INSERT INTO config (id, "adminPassword", positions, workplaces, "updatedAt")
    VALUES ('main', ${nextPassword}, ${JSON.stringify(nextPositions)}::jsonb, ${JSON.stringify(nextWorkplaces)}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET
      "adminPassword" = EXCLUDED."adminPassword",
      positions = EXCLUDED.positions,
      workplaces = EXCLUDED.workplaces,
      "updatedAt" = NOW()
  `;

  return {
    adminPassword: nextPassword,
    positions: nextPositions,
    workplaces: nextWorkplaces,
  };
}
