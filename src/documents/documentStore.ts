import type { DocumentRecord, MixerLevels, MixerState, SoundLayer } from "./documentTypes";

const STORAGE_KEY = "kotoba-room.documents";
const ACTIVE_KEY = "kotoba-room.active";
const layers: SoundLayer[] = ["brown", "pink", "white", "rain", "storm", "wind", "stream", "waves", "hum", "fan", "vinyl", "fire"];
export const defaultLevels = Object.fromEntries(layers.map((layer) => [layer, 0])) as MixerLevels;
const defaultMixer: MixerState = { master: 0.35, muted: false, levels: { ...defaultLevels } };

function newId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function makeDocument(title = "Untitled room"): DocumentRecord {
  const now = Date.now();
  return { id: newId(), title, body: "", createdAt: now, updatedAt: now, selectedEnvironmentId: "ink", mixer: { master: defaultMixer.master, muted: false, levels: { ...defaultLevels } }, timerDuration: 25 };
}

function normalize(document: DocumentRecord): DocumentRecord {
  const fresh = makeDocument(document.title || "Untitled room");
  return { ...fresh, ...document, mixer: { ...fresh.mixer, ...(document.mixer ?? {}), levels: { ...defaultLevels, ...(document.mixer?.levels ?? {}) } } };
}

export function loadDocuments(): { documents: DocumentRecord[]; activeId: string | null } {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as DocumentRecord[];
    return { documents: Array.isArray(parsed) ? parsed.map(normalize) : [], activeId: localStorage.getItem(ACTIVE_KEY) };
  } catch {
    return { documents: [], activeId: null };
  }
}

export function saveDocuments(documents: DocumentRecord[], activeId: string | null): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
  } catch {
    // Storage failure must not interrupt writing.
  }
}
