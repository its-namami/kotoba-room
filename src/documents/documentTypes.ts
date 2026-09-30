export interface MixerState {
  master: number;
  brown: number;
  pink: number;
  rain: number;
  hum: number;
  muted: boolean;
}

export interface DocumentRecord {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  selectedEnvironmentId: string;
  mixer: MixerState;
}
