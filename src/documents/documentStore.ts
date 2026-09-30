import type { DocumentRecord, MixerState } from "./documentTypes";

const STORAGE_KEY = "kotoba-room.documents";
const ACTIVE_KEY = "kotoba-room.active";
const defaultMixer: MixerState = { master: 0.35, brown: 0, pink: 0, rain: 0, hum: 0, muted: false };

function newId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function makeDocument(title = "Untitled room"): DocumentRecord {
  const now = Date.now();
  return { id: newId(), title, body: "", createdAt: now, updatedAt: now, selectedEnvironmentId: "ink", mixer: { ...defaultMixer } };
}

export function loadDocuments(): { documents: DocumentRecord[]; activeId: string | null } {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as DocumentRecord[];
    const documents = Array.isArray(parsed) ? parsed : [];
    return { documents, activeId: localStorage.getItem(ACTIVE_KEY) };
  } catch {
    return { documents: [], activeId: null };
  }
}

export function saveDocuments(documents: DocumentRecord[], activeId: string | null): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
  } catch {
    // Private browsing and storage quotas should not interrupt writing.
  }
}
