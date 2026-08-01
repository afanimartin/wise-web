export type AuditStatus = "success" | "failure";

export type AuditEntry = {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  summary: string;
  details: Record<string, unknown>;
  status: AuditStatus;
  apiStatus?: number;
};

const STORAGE_KEY = "wise-admin-audit-log";
const MAX_ENTRIES = 200;

function readEntries(): AuditEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AuditEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: AuditEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function listAuditEntries(limit = 50): AuditEntry[] {
  return readEntries().slice(0, limit);
}

export function appendAuditEntry(entry: Omit<AuditEntry, "id" | "timestamp">) {
  const nextEntry: AuditEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };

  writeEntries([nextEntry, ...readEntries()]);
  return nextEntry;
}

export function clearAuditEntries() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
