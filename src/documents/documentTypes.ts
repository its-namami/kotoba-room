export type SoundLayer = "brown" | "pink" | "white" | "rain" | "storm" | "wind" | "stream" | "waves" | "hum" | "fan" | "vinyl" | "fire";

export type MixerLevels = Record<SoundLayer, number>;

export interface MixerState {
  master: number;
  muted: boolean;
  levels: MixerLevels;
}

export interface DocumentRecord {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  selectedEnvironmentId: string;
  mixer: MixerState;
  timerDuration: number;
}
