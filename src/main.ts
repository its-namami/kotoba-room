import "./style.css";
import { environments } from "./environment/environments";
import { SoundEngine } from "./environment/soundEngine";
import { defaultLevels, loadDocuments, makeDocument, saveDocuments } from "./documents/documentStore";
import type { DocumentRecord, MixerState, SoundLayer } from "./documents/documentTypes";
import { splitSentences } from "./documents/sentenceSplitter";

type Mode = "write" | "read";
type Modal = "library" | "sound" | "environment" | "timer" | null;
interface Preset { name: string; environment: string; layers: Partial<Record<SoundLayer, number>>; timer: number; }

const presets: Preset[] = [
  { name: "Rain Desk", environment: "rain", layers: { rain: 0.28, pink: 0.06, hum: 0.04 }, timer: 25 },
  { name: "Night Train", environment: "night-train", layers: { brown: 0.2, fan: 0.08, hum: 0.07 }, timer: 45 },
  { name: "Warm Room", environment: "lantern", layers: { fire: 0.2, vinyl: 0.08, hum: 0.06 }, timer: 25 },
  { name: "Deep Focus", environment: "ink", layers: { brown: 0.16, pink: 0.08, fan: 0.09 }, timer: 60 }
];
const layerGroups: { label: string; layers: [SoundLayer, string][] }[] = [
  { label: "Noise", layers: [["brown", "Brown noise"], ["pink", "Pink noise"], ["white", "White noise"]] },
  { label: "Weather", layers: [["rain", "Soft rain"], ["storm", "Heavy rain"], ["wind", "Wind"]] },
  { label: "Room", layers: [["hum", "Room hum"], ["fan", "Fan"], ["vinyl", "Vinyl crackle"], ["fire", "Fireplace"]] }
];

const sound = new SoundEngine();
let { documents, activeId } = loadDocuments();
let mode: Mode = "write";
let focusEnabled = false;
let activeSentence = 0;
let modal: Modal = null;
let immersive = false;
let timerSeconds = 0;
let timerRunning = false;
let timerInterval: number | undefined;
let saveTimer: number | undefined;
const app = document.querySelector<HTMLDivElement>("#app")!;

if (activeId && !documents.some((document) => document.id === activeId)) activeId = null;
const getActive = (): DocumentRecord => documents.find((document) => document.id === activeId) ?? documents[0];
const currentEnvironment = () => {
  const item = getActive();
  return environments.find((environment) => environment.id === item?.selectedEnvironmentId) ?? environments[0];
};
const persist = () => saveDocuments(documents, activeId);

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

function queueSave(): void {
  window.clearTimeout(saveTimer);
  app.querySelector<HTMLElement>("[data-saved]")?.classList.add("editing");
  saveTimer = window.setTimeout(() => {
    getActive().updatedAt = Date.now();
    persist();
    const saved = app.querySelector<HTMLElement>("[data-saved]");
    if (saved) { saved.textContent = "saved"; saved.classList.remove("editing"); }
  }, 450);
}

function setEnvironmentVars(): void {
  const environment = currentEnvironment();
  document.documentElement.style.setProperty("--ink", environment.ink);
  document.documentElement.style.setProperty("--paper", environment.paper);
  document.documentElement.style.setProperty("--accent", environment.accent);
  environment.colors.forEach((color, index) => document.documentElement.style.setProperty(`--field-${index + 1}`, color));
}

function render(): void {
  setEnvironmentVars();
  if (!documents.length) {
    app.innerHTML = `<div class="atmosphere" aria-hidden="true"><i></i><i></i><i></i><i></i></div><section class="welcome"><p class="welcome-mark">KOTOBA ROOM</p><h1>A place for text.</h1><p class="welcome-note">A quiet room for writing and reading Japanese text.</p><div class="welcome-actions"><button data-action="new">New document</button><label class="text-link">Import text<input type="file" accept=".txt,.md,text/plain,text/markdown" data-import hidden></label></div></section>`;
    wireEvents();
    return;
  }
  const item = getActive();
  app.innerHTML = `<div class="atmosphere ${item.texture}" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <header class="topbar">
      <button class="brand" data-action="library" aria-label="Open document library">KOTOBA <span>ROOM</span></button>
      <div class="room-controls">
        <input class="document-title" data-title value="${escapeHtml(item.title)}" aria-label="Document title">
        <div class="mode-switch" role="group" aria-label="Reading mode"><button class="${mode === "write" ? "active" : ""}" data-action="write">Write</button><button class="${mode === "read" ? "active" : ""}" data-action="read">Read</button></div>
        <button data-action="environment">${currentEnvironment().name}</button>
        <button data-action="sound" class="sound-trigger">Sound ${activeSoundCount() ? `<b>${activeSoundCount()}</b>` : ""}</button>
        <button data-action="timer" class="timer-trigger">${timerRunning ? formatTime(timerSeconds) : "Timer"}</button>
        <button data-action="library" class="library-trigger" aria-label="Document library">⌗</button>
      </div>
      <span class="saved-state" data-saved>saved</span>
    </header>
    <main class="room ${mode === "read" ? "is-reading" : "is-writing"}">${mode === "write" ? writeView(item) : readView(item)}</main>
    ${modalMarkup()}`;
  if (immersive) app.classList.add("immersive"); else app.classList.remove("immersive");
  wireEvents();
}

function writeView(item: DocumentRecord): string {
  return `<section class="writing-room"><textarea data-body aria-label="Document body" placeholder="Begin with a line…">${escapeHtml(item.body)}</textarea></section>`;
}

function readView(item: DocumentRecord): string {
  const sentences = splitSentences(item.body);
  if (!sentences.length) return `<section class="reading-room empty-reading"><h1>${escapeHtml(item.title)}</h1><p>Your room is ready when you are.</p><button data-action="write">Begin writing</button></section>`;
  return `<section class="reading-room ${focusEnabled ? "focus-reading" : ""}"><div class="reading-heading"><span>${escapeHtml(item.title)}</span><button data-action="write">Edit text</button></div><article class="${focusEnabled ? "focus-on" : ""}">${structuredReading(item.body)}</article><div class="reading-controls ${focusEnabled ? "focus-controls" : ""}">${focusEnabled ? `<button data-action="previous" ${activeSentence === 0 ? "disabled" : ""}>← Previous sentence</button><button data-action="next" ${activeSentence >= sentences.length - 1 ? "disabled" : ""}>Next sentence →</button>` : ""}<button data-action="copy">Copy sentence</button><button data-action="context">Copy context</button><button data-action="focus" class="${focusEnabled ? "active" : ""}">Sentence focus</button></div></section>`;
}

function structuredReading(body: string): string {
  let sentenceIndex = 0;
  return body.replace(/\r\n?/g, "\n").split("\n").map((line) => {
    if (!line) return "<div class=\"reading-line blank\" aria-hidden=\"true\"></div>";
    const matches = line.match(/[^。！？.!?]+[。！？.!?]+|[^。！？.!?]+$/g) ?? [line];
    const rendered = matches.map((match) => {
      const index = sentenceIndex;
      sentenceIndex += 1;
      return `<span class="sentence ${distance(index)}" data-sentence="${index}" tabindex="0">${escapeHtml(match)}</span>`;
    }).join("");
    return `<div class="reading-line">${rendered}</div>`;
  }).join("");
}

function distance(index: number): string {
  if (!focusEnabled) return "near";
  const gap = Math.abs(index - activeSentence);
  return gap === 0 ? "active" : gap === 1 ? "near" : "far";
}

function modalMarkup(): string {
  if (!modal) return "";
  if (modal === "environment")   return `<div class="modal-backdrop" data-action="close-modal"><section class="panel" role="dialog" aria-modal="true" aria-labelledby="panel-title"><button class="close" data-action="close-modal">×</button><p class="eyebrow">Environment</p><h2 id="panel-title">Choose a room</h2><div class="environment-list">${environments.map((environment) => `<button class="${environment.id === currentEnvironment().id ? "chosen" : ""}" data-environment="${environment.id}"><strong>${environment.name}</strong><small>${environment.note}</small></button>`).join("")}</div><div class="texture-choice"><p class="eyebrow">Texture</p><button data-texture="drift" class="${getActive().texture === "drift" ? "chosen" : ""}">Drift</button><button data-texture="wash" class="${getActive().texture === "wash" ? "chosen" : ""}">Color Wash</button></div></section></div>`;
  if (modal === "timer") return `<div class="modal-backdrop" data-action="close-modal"><section class="panel timer-panel" role="dialog" aria-modal="true" aria-labelledby="panel-title"><button class="close" data-action="close-modal">×</button><p class="eyebrow">Focus timer</p><h2 id="panel-title">${timerRunning ? formatTime(timerSeconds) : "A little time for text"}</h2><div class="timer-presets">${[25, 45, 60].map((minutes) => `<button data-timer="${minutes}" class="${getActive().timerDuration === minutes ? "chosen" : ""}">${minutes} min</button>`).join("")}</div><div class="timer-actions"><button data-action="timer-start">${timerRunning ? "Pause" : "Start"}</button><button data-action="timer-reset">Reset</button></div><p class="panel-note">The timer stays quiet while you write.</p></section></div>`;
  if (modal === "sound") return soundPanel();
  return libraryPanel();
}

function soundPanel(): string {
  const mixer = getActive().mixer;
  return `<div class="modal-backdrop" data-action="close-modal"><section class="panel sound-panel" role="dialog" aria-modal="true" aria-labelledby="panel-title"><button class="close" data-action="close-modal">×</button><p class="eyebrow">Ambient sound</p><h2 id="panel-title">Build a sound room</h2><div class="preset-list">${presets.map((preset) => `<button data-preset="${preset.name}">${preset.name}</button>`).join("")}</div><div class="master-row"><button data-action="mute" class="${mixer.muted ? "chosen" : ""}">${mixer.muted ? "Muted" : "Master"}</button><input type="range" min="0" max="1" step=".01" value="${mixer.master}" data-mixer="master" aria-label="Master volume"></div>${layerGroups.map((group) => `<div class="sound-group"><h3>${group.label}</h3>${group.layers.map(([layer, label]) => `<label class="sound-row"><span><input type="checkbox" data-layer-toggle="${layer}" ${mixer.levels[layer] > 0 ? "checked" : ""}> ${label}</span><input type="range" min="0" max=".35" step=".01" value="${mixer.levels[layer]}" data-mixer="${layer}" aria-label="${label} volume"></label>`).join("")}</div>`).join("")}<p class="panel-note">Sound is generated locally and begins only when you interact with a control.</p></section></div>`;
}

function libraryPanel(): string {
  return `<div class="modal-backdrop" data-action="close-modal"><section class="panel library-panel" role="dialog" aria-modal="true" aria-labelledby="panel-title"><button class="close" data-action="close-modal">×</button><p class="eyebrow">Library</p><h2 id="panel-title">Your rooms</h2><div class="library-actions"><button data-action="new">New document</button><label class="text-link">Import text<input type="file" accept=".txt,.md,text/plain,text/markdown" data-import hidden></label></div><div class="document-list">${documents.map((item) => `<div class="document-row ${item.id === activeId ? "selected" : ""}"><button data-document="${item.id}"><strong>${escapeHtml(item.title)}</strong><small>${item.body ? `${item.body.length} characters` : "Empty room"}</small></button><button class="row-action" data-rename="${item.id}">Rename</button><button class="row-action danger" data-delete="${item.id}">Delete</button></div>`).join("")}</div><div class="export-actions"><button data-action="duplicate">Duplicate</button><button data-action="export-txt">Export .txt</button><button data-action="export-md">Export .md</button></div></section></div>`;
}

function activeSoundCount(): number {
  return Object.values(getActive().mixer.levels).filter((value) => value > 0).length;
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function startTimer(): void {
  if (timerRunning) { timerRunning = false; window.clearInterval(timerInterval); render(); return; }
  if (!timerSeconds) timerSeconds = getActive().timerDuration * 60;
  timerRunning = true;
  timerInterval = window.setInterval(() => {
    timerSeconds -= 1;
    if (timerSeconds <= 0) { timerSeconds = 0; timerRunning = false; window.clearInterval(timerInterval); sound.chime(); }
    render();
  }, 1000);
  modal = null;
  render();
}

function applyPreset(name: string): void {
  const preset = presets.find((item) => item.name === name);
  if (!preset) return;
  const levels = { ...defaultLevels, ...preset.layers };
  getActive().mixer = { ...getActive().mixer, levels };
  getActive().selectedEnvironmentId = preset.environment;
  getActive().timerDuration = preset.timer;
  persist();
  sound.update(getActive().mixer);
  render();
  modal = "sound";
  render();
}

function wireEvents(): void {
  app.querySelectorAll<HTMLElement>("[data-action]").forEach((element) => element.addEventListener("click", (event) => {
    const action = (event.currentTarget as HTMLElement).dataset.action;
    if (action === "write") { mode = "write"; modal = null; render(); }
    if (action === "read") { mode = "read"; modal = null; activeSentence = 0; render(); }
    if (action === "focus") { focusEnabled = !focusEnabled; render(); focusActive(); }
    if (action === "library" || action === "sound" || action === "environment" || action === "timer") { modal = action; render(); }
    if (action === "close-modal" && (event.target as HTMLElement).dataset.action === "close-modal") { modal = null; render(); }
    if (action === "new") { const created = makeDocument(); documents.unshift(created); activeId = created.id; modal = null; mode = "write"; persist(); render(); }
    if (action === "duplicate") { const copy = { ...getActive(), id: crypto.randomUUID?.() ?? `${Date.now()}`, title: `${getActive().title} copy`, createdAt: Date.now(), updatedAt: Date.now(), mixer: { ...getActive().mixer, levels: { ...getActive().mixer.levels } } }; documents.unshift(copy); activeId = copy.id; modal = null; persist(); render(); }
    if (action === "previous") { activeSentence = Math.max(0, activeSentence - 1); updateReaderFocus(); }
    if (action === "next") { activeSentence = Math.min(splitSentences(getActive().body).length - 1, activeSentence + 1); updateReaderFocus(); }
    if (action === "copy" || action === "context") void copySentence(action === "context");
    if (action === "mute") { getActive().mixer.muted = !getActive().mixer.muted; sound.update(getActive().mixer); persist(); render(); }
    if (action === "timer-start") startTimer();
    if (action === "timer-reset") { timerRunning = false; timerSeconds = 0; window.clearInterval(timerInterval); render(); }
    if (action === "export-txt" || action === "export-md") exportDocument(action === "export-md" ? "md" : "txt");
  }));
  app.querySelectorAll<HTMLElement>("[data-sentence]").forEach((element) => element.addEventListener("click", () => { activeSentence = Number(element.dataset.sentence); if (!focusEnabled) { focusEnabled = true; render(); } updateReaderFocus(); }));
  app.querySelectorAll<HTMLElement>("[data-environment]").forEach((element) => element.addEventListener("click", () => { getActive().selectedEnvironmentId = element.dataset.environment ?? "ink"; persist(); modal = null; render(); }));
  app.querySelectorAll<HTMLElement>("[data-texture]").forEach((element) => element.addEventListener("click", () => { getActive().texture = element.dataset.texture === "wash" ? "wash" : "drift"; persist(); modal = null; render(); }));
  app.querySelectorAll<HTMLElement>("[data-document]").forEach((element) => element.addEventListener("click", () => { activeId = element.dataset.document ?? activeId; modal = null; persist(); render(); }));
  app.querySelectorAll<HTMLElement>("[data-rename]").forEach((element) => element.addEventListener("click", () => { const item = documents.find((entry) => entry.id === element.dataset.rename); const title = item && window.prompt("Name this room", item.title); if (item && title?.trim()) { item.title = title.trim(); persist(); render(); } }));
  app.querySelectorAll<HTMLElement>("[data-delete]").forEach((element) => element.addEventListener("click", () => { if (documents.length > 1 && window.confirm("Delete this room?")) { documents = documents.filter((item) => item.id !== element.dataset.delete); if (activeId === element.dataset.delete) activeId = documents[0].id; persist(); render(); } }));
  app.querySelectorAll<HTMLElement>("[data-preset]").forEach((element) => element.addEventListener("click", () => applyPreset(element.dataset.preset ?? "")));
  app.querySelectorAll<HTMLElement>("[data-timer]").forEach((element) => element.addEventListener("click", () => { getActive().timerDuration = Number(element.dataset.timer); timerSeconds = getActive().timerDuration * 60; persist(); render(); }));
  const body = app.querySelector<HTMLTextAreaElement>("[data-body]");
  body?.addEventListener("input", () => { getActive().body = body.value; queueSave(); });
  body?.addEventListener("focus", () => { immersive = true; app.classList.add("immersive"); });
  body?.addEventListener("blur", () => { immersive = false; app.classList.remove("immersive"); });
  app.querySelector<HTMLInputElement>("[data-title]")?.addEventListener("input", (event) => { getActive().title = (event.target as HTMLInputElement).value || "Untitled room"; queueSave(); });
  app.querySelectorAll<HTMLInputElement>("[data-mixer]").forEach((input) => input.addEventListener("input", () => { const key = input.dataset.mixer; if (key === "master") getActive().mixer.master = Number(input.value); else if (key) getActive().mixer.levels[key as SoundLayer] = Number(input.value); sound.update(getActive().mixer); persist(); }));
  app.querySelectorAll<HTMLInputElement>("[data-layer-toggle]").forEach((input) => input.addEventListener("change", () => { const layer = input.dataset.layerToggle as SoundLayer; getActive().mixer.levels[layer] = input.checked ? 0.12 : 0; sound.update(getActive().mixer); persist(); render(); }));
  app.querySelector<HTMLInputElement>("[data-import]")?.addEventListener("change", (event) => { const file = (event.target as HTMLInputElement).files?.[0]; if (file) void file.text().then((body) => { const imported = makeDocument(file.name.replace(/\.(txt|md)$/i, "")); imported.body = body; documents.unshift(imported); activeId = imported.id; modal = null; persist(); render(); }); });
}

function focusActive(): void {
  document.querySelector<HTMLElement>(`[data-sentence="${activeSentence}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function updateReaderFocus(): void {
  app.querySelectorAll<HTMLElement>("[data-sentence]").forEach((element) => {
    const index = Number(element.dataset.sentence);
    element.classList.toggle("active", index === activeSentence);
    element.classList.toggle("near", Math.abs(index - activeSentence) === 1);
    element.classList.toggle("far", Math.abs(index - activeSentence) > 1);
  });
  const previous = app.querySelector<HTMLButtonElement>('[data-action="previous"]');
  const next = app.querySelector<HTMLButtonElement>('[data-action="next"]');
  const count = app.querySelectorAll("[data-sentence]").length;
  if (previous) previous.disabled = activeSentence === 0;
  if (next) next.disabled = activeSentence >= count - 1;
  focusActive();
}

async function copySentence(withContext: boolean): Promise<void> {
  const sentences = splitSentences(getActive().body);
  const start = withContext ? Math.max(0, activeSentence - 1) : activeSentence;
  const end = withContext ? Math.min(sentences.length - 1, activeSentence + 1) : activeSentence;
  await navigator.clipboard?.writeText(sentences.slice(start, end + 1).map((sentence) => sentence.text).join(" "));
}

function exportDocument(extension: "txt" | "md"): void {
  const item = getActive();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([item.body], { type: "text/plain;charset=utf-8" }));
  link.download = `${item.title || "kotoba-room"}.${extension}`;
  link.click();
  URL.revokeObjectURL(link.href);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (modal) { modal = null; render(); return; }
    if (immersive) { immersive = false; app.classList.remove("immersive"); }
  }
});

render();
