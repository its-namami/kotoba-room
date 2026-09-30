import "./style.css";
import { environments } from "./environment/environments";
import { SoundEngine } from "./environment/soundEngine";
import { makeDocument, loadDocuments, saveDocuments } from "./documents/documentStore";
import type { DocumentRecord, MixerState } from "./documents/documentTypes";
import { splitSentences } from "./documents/sentenceSplitter";

type Mode = "write" | "read";
const sound = new SoundEngine();
let { documents, activeId } = loadDocuments();
let mode: Mode = "write";
let focusEnabled = false;
let activeSentence = 0;
let dockTimer: number | undefined;
let saveTimer: number | undefined;
let modal: "library" | "sound" | "environment" | null = null;

if (activeId && !documents.some((document) => document.id === activeId)) activeId = null;

const app = document.querySelector<HTMLDivElement>("#app")!;
const getActive = (): DocumentRecord => documents.find((document) => document.id === activeId) ?? documents[0];
const currentEnvironment = () => environments.find((environment) => environment.id === getActive().selectedEnvironmentId) ?? environments[0];

function persist(): void {
  saveDocuments(documents, activeId);
}

function queueSave(): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    getActive().updatedAt = Date.now();
    persist();
    const saved = document.querySelector<HTMLElement>("[data-saved]");
    if (saved) { saved.textContent = "Saved"; saved.classList.add("is-visible"); }
  }, 450);
  const saved = document.querySelector<HTMLElement>("[data-saved]");
  if (saved) { saved.textContent = "Editing"; saved.classList.add("is-visible"); }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

function render(): void {
  if (!documents.length) {
    app.innerHTML = `<div class="atmosphere" aria-hidden="true"><i></i><i></i><i></i><i></i></div><section class="welcome"><p class="welcome-mark">KOTOBA ROOM</p><h1>A place for text.</h1><p class="welcome-note">A quiet room for writing and reading Japanese text.</p><div class="welcome-actions"><button data-action="new">New document</button><label class="file-button">Import text<input type="file" accept=".txt,.md,text/plain,text/markdown" data-import hidden></label></div></section>`;
    wireEvents();
    return;
  }
  const documentRecord = getActive();
  const environment = currentEnvironment();
  document.documentElement.style.setProperty("--ink", environment.ink);
  document.documentElement.style.setProperty("--paper", environment.paper);
  document.documentElement.style.setProperty("--accent", environment.accent);
  document.documentElement.style.setProperty("--field-a", environment.colors[0]);
  document.documentElement.style.setProperty("--field-b", environment.colors[1]);
  document.documentElement.style.setProperty("--field-c", environment.colors[2]);
  document.documentElement.style.setProperty("--field-d", environment.colors[3]);
  app.innerHTML = `
    <div class="atmosphere" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <header class="topbar">
      <button class="wordmark" data-action="library" aria-label="Open document library">KOTOBA <span>ROOM</span></button>
      <div class="mode-label">${mode === "write" ? "Writing room" : "Reading room"}</div>
      <span class="saved-state" data-saved>Saved</span>
    </header>
    <main class="room ${mode === "read" ? "is-reading" : "is-writing"}">
      ${mode === "write" ? writeView(documentRecord) : readView(documentRecord)}
    </main>
    <div class="dock-zone" data-dock-zone>
      <button class="reveal-handle" data-action="reveal" aria-label="Reveal room controls"><span></span></button>
      <nav class="mode-dock" aria-label="Room controls">
        <button class="${mode === "write" ? "active" : ""}" data-action="write">Write</button>
        <button class="${mode === "read" ? "active" : ""}" data-action="read">Read</button>
        <button data-action="library" aria-label="Document library">▦</button>
        <button data-action="environment" aria-label="Choose environment">${environment.name}</button>
        <button data-action="sound" aria-label="Open sound mixer">◌ Sound</button>
        ${mode === "read" ? `<button class="${focusEnabled ? "active" : ""}" data-action="focus">Focus</button>` : ""}
      </nav>
    </div>
    ${modalMarkup()}
  `;
  wireEvents();
  if (mode === "read") scheduleDockHide();
}

function writeView(documentRecord: DocumentRecord): string {
  return `<section class="writing-surface">
    <input class="title-input" data-title value="${escapeHtml(documentRecord.title)}" aria-label="Document title" />
    <textarea data-body aria-label="Document body" placeholder="Begin with a line…">${escapeHtml(documentRecord.body)}</textarea>
    <div class="surface-footer"><span>Local document</span><span>Japanese text is welcome</span></div>
  </section>`;
}

function readView(documentRecord: DocumentRecord): string {
  const sentences = splitSentences(documentRecord.body);
  if (!sentences.length) return `<section class="reading-surface empty-reading"><h1>${escapeHtml(documentRecord.title)}</h1><p>Your room is ready when you are.</p><button data-action="write">Begin writing</button></section>`;
  return `<section class="reading-surface"><div class="reading-heading"><span>${escapeHtml(documentRecord.title)}</span><button data-action="write">Edit text</button></div><article class="${focusEnabled ? "focus-on" : ""}">${sentences.map((sentence, index) => `<span class="sentence sentence-${distance(index)}" data-sentence="${index}" tabindex="0">${escapeHtml(sentence.text)}</span>${sentence.paragraph !== sentences[index + 1]?.paragraph ? "<span class=\"paragraph-break\"></span>" : " "}`).join("")}</article><div class="reading-controls"><button data-action="previous" ${activeSentence === 0 ? "disabled" : ""}>← Previous</button><span>${activeSentence + 1} / ${sentences.length}</span><button data-action="next" ${activeSentence >= sentences.length - 1 ? "disabled" : ""}>Next →</button><button data-action="copy">Copy sentence</button><button data-action="context">Copy context</button></div></section>`;
}

function distance(index: number): string {
  if (!focusEnabled) return "near";
  const distance = Math.abs(index - activeSentence);
  return distance === 0 ? "active" : distance === 1 ? "near" : "far";
}

function modalMarkup(): string {
  if (!modal) return "";
  if (modal === "environment") return `<div class="modal-backdrop" data-action="close-modal"><section class="panel" role="dialog" aria-modal="true" aria-labelledby="panel-title"><button class="close" data-action="close-modal">×</button><p class="eyebrow">Atmosphere</p><h2 id="panel-title">Choose a room</h2><div class="environment-list">${environments.map((item) => `<button class="${item.id === currentEnvironment().id ? "chosen" : ""}" data-environment="${item.id}"><strong>${item.name}</strong><small>${item.note}</small></button>`).join("")}</div></section></div>`;
  if (modal === "sound") {
    const mixer = getActive().mixer;
    return `<div class="modal-backdrop" data-action="close-modal"><section class="panel sound-panel" role="dialog" aria-modal="true" aria-labelledby="panel-title"><button class="close" data-action="close-modal">×</button><p class="eyebrow">Atmosphere</p><h2 id="panel-title">Sound mixer</h2><button class="mute-button ${mixer.muted ? "chosen" : ""}" data-action="mute">${mixer.muted ? "Muted" : "Master on"}</button><label>Master <input type="range" min="0" max="1" step="0.01" value="${mixer.master}" data-mixer="master"></label>${(["brown", "pink", "rain", "hum"] as const).map((name) => `<label>${name === "brown" ? "Brown noise" : name === "pink" ? "Pink noise" : name === "rain" ? "Soft rain" : "Room hum"} <input type="range" min="0" max="1" step="0.01" value="${mixer[name]}" data-mixer="${name}"></label>`).join("")}<p class="panel-note">Sound begins only after you move a control.</p></section></div>`;
  }
  return `<div class="modal-backdrop" data-action="close-modal"><section class="panel library-panel" role="dialog" aria-modal="true" aria-labelledby="panel-title"><button class="close" data-action="close-modal">×</button><p class="eyebrow">Library</p><h2 id="panel-title">Your rooms</h2><div class="library-actions"><button data-action="new">New document</button><label class="file-button">Import text<input type="file" accept=".txt,.md,text/plain,text/markdown" data-import hidden></label></div><div class="document-list">${documents.map((item) => `<div class="document-row ${item.id === activeId ? "selected" : ""}"><button data-document="${item.id}"><strong>${escapeHtml(item.title)}</strong><small>${item.body ? `${item.body.length} characters` : "Empty room"}</small></button><button class="row-action" data-rename="${item.id}" aria-label="Rename ${escapeHtml(item.title)}">Rename</button><button class="row-action danger" data-delete="${item.id}" aria-label="Delete ${escapeHtml(item.title)}">Delete</button></div>`).join("")}</div><div class="export-actions"><button data-action="duplicate">Duplicate current</button><button data-action="export-txt">Export .txt</button><button data-action="export-md">Export .md</button></div></section></div>`;
}

function scheduleDockHide(): void {
  window.clearTimeout(dockTimer);
  dockTimer = window.setTimeout(() => document.querySelector(".dock-zone")?.classList.add("is-hidden"), 1800);
}

function wireEvents(): void {
  app.querySelectorAll<HTMLElement>("[data-action]").forEach((element) => element.addEventListener("click", (event) => {
    const target = event.currentTarget as HTMLElement;
    const action = target.dataset.action;
    if (action === "write") { mode = "write"; modal = null; render(); }
    if (action === "read") { mode = "read"; modal = null; activeSentence = 0; render(); }
    if (action === "focus") { focusEnabled = !focusEnabled; render(); focusActive(); }
    if (action === "reveal") { document.querySelector(".dock-zone")?.classList.remove("is-hidden"); scheduleDockHide(); }
    if (action === "library" || action === "sound" || action === "environment") { modal = action === "library" ? "library" : action; render(); }
    if (action === "close-modal") { if ((event.target as HTMLElement).dataset.action === "close-modal") { modal = null; render(); } }
    if (action === "new") { const created = makeDocument(); documents.unshift(created); activeId = created.id; modal = null; mode = "write"; persist(); render(); }
    if (action === "duplicate") { const copy = { ...getActive(), id: crypto.randomUUID?.() ?? `${Date.now()}`, title: `${getActive().title} copy`, createdAt: Date.now(), updatedAt: Date.now() }; documents.unshift(copy); activeId = copy.id; modal = null; persist(); render(); }
    if (action === "previous") { activeSentence = Math.max(0, activeSentence - 1); render(); focusActive(); }
    if (action === "next") { activeSentence = Math.min(splitSentences(getActive().body).length - 1, activeSentence + 1); render(); focusActive(); }
    if (action === "copy" || action === "context") void copySentence(action === "context");
    if (action === "mute") { getActive().mixer.muted = !getActive().mixer.muted; sound.update(getActive().mixer); persist(); render(); }
    if (action === "export-txt" || action === "export-md") exportDocument(action === "export-md" ? "md" : "txt");
  }));
  app.querySelectorAll<HTMLElement>("[data-sentence]").forEach((element) => element.addEventListener("click", () => { activeSentence = Number(element.dataset.sentence); focusEnabled = true; render(); focusActive(); }));
  const body = app.querySelector<HTMLTextAreaElement>("[data-body]");
  body?.addEventListener("input", () => { getActive().body = body.value; queueSave(); });
  const title = app.querySelector<HTMLInputElement>("[data-title]");
  title?.addEventListener("input", () => { getActive().title = title.value || "Untitled room"; queueSave(); });
  app.querySelectorAll<HTMLInputElement>("[data-mixer]").forEach((input) => input.addEventListener("input", () => { const key = input.dataset.mixer as keyof MixerState; if (key !== "muted") getActive().mixer[key] = Number(input.value); sound.update(getActive().mixer); persist(); }));
  app.querySelectorAll<HTMLElement>("[data-environment]").forEach((element) => element.addEventListener("click", () => { getActive().selectedEnvironmentId = element.dataset.environment ?? "ink"; persist(); modal = null; render(); }));
  app.querySelectorAll<HTMLElement>("[data-document]").forEach((element) => element.addEventListener("click", () => { activeId = element.dataset.document ?? activeId; modal = null; persist(); render(); }));
  app.querySelectorAll<HTMLElement>("[data-rename]").forEach((element) => element.addEventListener("click", () => { const item = documents.find((entry) => entry.id === element.dataset.rename); if (item) { const title = window.prompt("Name this room", item.title); if (title?.trim()) { item.title = title.trim(); item.updatedAt = Date.now(); persist(); render(); } } }));
  app.querySelectorAll<HTMLElement>("[data-delete]").forEach((element) => element.addEventListener("click", () => { if (documents.length < 2) return; if (window.confirm("Delete this room?")) { documents = documents.filter((item) => item.id !== element.dataset.delete); if (activeId === element.dataset.delete) activeId = documents[0].id; persist(); render(); } }));
  app.querySelector<HTMLInputElement>("[data-import]")?.addEventListener("change", (event) => { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; void file.text().then((body) => { const imported = makeDocument(file.name.replace(/\.(txt|md)$/i, "")); imported.body = body; documents.unshift(imported); activeId = imported.id; modal = null; persist(); render(); }); });
  app.querySelector<HTMLElement>("[data-dock-zone]")?.addEventListener("mouseenter", () => { window.clearTimeout(dockTimer); document.querySelector(".dock-zone")?.classList.remove("is-hidden"); });
  app.querySelector<HTMLElement>("[data-dock-zone]")?.addEventListener("mouseleave", () => { if (mode === "read") scheduleDockHide(); });
  app.querySelector<HTMLElement>("[data-dock-zone]")?.addEventListener("focusin", () => document.querySelector(".dock-zone")?.classList.remove("is-hidden"));
}

function focusActive(): void {
  document.querySelector<HTMLElement>(`[data-sentence="${activeSentence}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function copySentence(withContext: boolean): Promise<void> {
  const sentences = splitSentences(getActive().body);
  const start = withContext ? Math.max(0, activeSentence - 1) : activeSentence;
  const end = withContext ? Math.min(sentences.length - 1, activeSentence + 1) : activeSentence;
  await navigator.clipboard?.writeText(sentences.slice(start, end + 1).map((sentence) => sentence.text).join(" "));
}

function exportDocument(extension: "txt" | "md"): void {
  const item = getActive();
  const blob = new Blob([item.body], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${item.title || "kotoba-room"}.${extension}`;
  link.click();
  URL.revokeObjectURL(link.href);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (modal) { modal = null; render(); return; }
    document.querySelector(".dock-zone")?.classList.remove("is-hidden");
    if (mode === "read" && focusEnabled) { focusEnabled = false; render(); }
  }
});

render();
