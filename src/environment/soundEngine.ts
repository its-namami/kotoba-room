import type { MixerState } from "../documents/documentTypes";

type LayerName = "brown" | "pink" | "rain" | "hum";

export class SoundEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private layers = new Map<LayerName, GainNode>();
  private sources: AudioScheduledSourceNode[] = [];

  private ensureContext(): void {
    if (this.context) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.connect(this.context.destination);
    this.createNoise("brown", "brown");
    this.createNoise("pink", "pink");
    this.createNoise("rain", "rain");
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.frequency.value = 56;
    gain.gain.value = 0;
    oscillator.connect(gain).connect(this.master);
    oscillator.start();
    this.layers.set("hum", gain);
    this.sources.push(oscillator);
  }

  private createNoise(name: LayerName, type: "brown" | "pink" | "rain"): void {
    if (!this.context || !this.master) return;
    const buffer = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = type === "brown" ? (last + 0.02 * white) / 1.02 : white;
      data[i] = type === "pink" ? (last + white * 0.25) * 0.45 : last * (type === "rain" ? 0.7 : 2.8);
    }
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.value = 0;
    source.connect(gain).connect(this.master);
    source.start();
    this.layers.set(name, gain);
    this.sources.push(source);
  }

  update(state: MixerState): void {
    this.ensureContext();
    if (!this.context || !this.master) return;
    void this.context.resume();
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(state.muted ? 0 : state.master, now, 0.25);
    (["brown", "pink", "rain", "hum"] as LayerName[]).forEach((name) => {
      this.layers.get(name)?.gain.setTargetAtTime(state[name], now, 0.25);
    });
  }

  stop(): void {
    this.sources.forEach((source) => source.stop());
    this.sources = [];
    this.context?.close();
    this.context = null;
  }
}
