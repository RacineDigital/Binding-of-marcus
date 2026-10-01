// Placeholder interface; replaced by the full synthesizer engine.
export interface PlayOpts { vol?: number; pitch?: number; x?: number }
export class AudioEngine {
  play(_n: string, _o: PlayOpts = {}): void {}
  setMusic(_t: string | null): void {}
  /** Pre-render a music track in the background. */
  prepareMusic(_t: string): void {}
  setIntensity(_i: number): void {}
  stinger(_n: string): void {}
  unlock(): void {}
  setVolumes(_m: number, _s: number): void {}
  duck(_amt: number, _t: number): void {}
  update(_dt: number): void {}
}
