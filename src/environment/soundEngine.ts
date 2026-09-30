import type { MixerState, SoundLayer } from "../documents/documentTypes";

const noiseLayers: SoundLayer[] = ["brown", "pink", "white", "rain", "storm", "wind", "stream", "waves", "fan", "vinyl", "fire"];
const allLayers: SoundLayer[] = [...noiseLayers, "hum"];

export class SoundEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private gains = new Map<SoundLayer, GainNode>();
  private sources: AudioScheduledSourceNode[] = [];

  private ensureContext(): void {
    if (this.context) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.connect(this.context.destination);
    noiseLayers.forEach((layer) => this.createNoise(layer));
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.frequency.value = 56;
    gain.gain.value = 0;
    oscillator.connect(gain).connect(this.master);
    oscillator.start();
    this.gains.set("hum", gain);
    this.sources.push(oscillator);
  }

  private createNoise(layer: SoundLayer): void {
    if (!this.context || !this.master) return;
    const buffer = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < data.length; index += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      const raw = layer === "brown" ? last * 3 : layer === "pink" ? (last + white * 0.25) * 0.45 : white;
      data[index] = raw * (layer === "storm" || layer === "fire" ? 0.8 : layer === "rain" || layer === "stream" || layer === "waves" ? 0.55 : 0.35);
    }
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.value = 0;
    source.connect(gain).connect(this.master);
    source.start();
    this.gains.set(layer, gain);
    this.sources.push(source);
  }

  update(state: MixerState): void {
    this.ensureContext();
    if (!this.context || !this.master) return;
    void this.context.resume();
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(state.muted ? 0 : state.master, now, 0.3);
    allLayers.forEach((layer) => this.gains.get(layer)?.gain.setTargetAtTime(state.levels[layer], now, 0.3));
  }

  chime(): void {
    this.ensureContext();
    if (!this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.frequency.value = 520;
    gain.gain.setValueAtTime(0, this.context.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, this.context.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 1);
    oscillator.connect(gain).connect(this.master);
    oscillator.start();
    oscillator.stop(this.context.currentTime + 1.05);
  }
}
