import type { MixerState, SoundLayer } from "../documents/documentTypes";

const bufferLayers: SoundLayer[] = ["brown", "pink", "white", "rain", "storm", "wind", "fan", "vinyl", "fire"];
const allLayers: SoundLayer[] = [...bufferLayers, "hum"];

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
    bufferLayers.forEach((layer) => this.createLayer(layer));
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.frequency.value = 55;
    gain.gain.value = 0;
    oscillator.connect(gain).connect(this.master);
    oscillator.start();
    this.gains.set("hum", gain);
    this.sources.push(oscillator);
  }

  private createLayer(layer: SoundLayer): void {
    if (!this.context || !this.master) return;
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, sampleRate * 3, sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    let pink = 0;
    for (let index = 0; index < data.length; index += 1) {
      const white = Math.random() * 2 - 1;
      brown = (brown + 0.02 * white) / 1.02;
      pink = pink * 0.985 + white * 0.015;
      const time = index / sampleRate;
      if (layer === "brown") data[index] = brown * 3;
      else if (layer === "pink") data[index] = (pink * 2 + white * 0.12) * 1.5;
      else if (layer === "white") data[index] = white * 0.28;
      else if (layer === "rain") data[index] = Math.random() < 0.008 ? white * 0.9 : pink * 0.22;
      else if (layer === "storm") data[index] = (Math.random() < 0.012 ? white * 1.1 : pink * 0.35) + brown * 0.7;
      else if (layer === "wind") data[index] = (brown * 0.8 + white * 0.08) * (0.45 + Math.sin(time * 0.42) * 0.35);
      else if (layer === "fan") data[index] = (white * 0.12 + Math.sin(time * 2 * Math.PI * 112) * 0.1) * (0.8 + Math.sin(time * 0.7) * 0.1);
      else if (layer === "vinyl") data[index] = Math.random() < 0.0007 ? white * 1.1 : white * 0.025;
      else data[index] = Math.random() < 0.0012 ? white * 0.9 : (brown * 0.12 + white * 0.02);
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
