// Placeholder interface; replaced by the full synthesizer engine.
export interface PlayOpts { vol?: number; pitch?: number; x?: number }
export class AudioEngine {
  play(_n: string, _o: PlayOpts = {}): void {}
  setMusic(_t: string | null): void {}
  /** Pre-render a music track in the background. */
  prepareMusic(_t: string): void {}
  setIntensity(_i: number): void {}
  stinger(_n: string): void {}
  /** A boss's own sting for its title card (see bossting.ts). */
  bossSting(_id: string, _kind: 'chapter' | 'final' | 'echo' | 'champion'): void {}
  unlock(): void {}
  setVolumes(_m: number, _s: number, _a?: number): void {}
  /** The floor's ambience (see ambience.ts), or null for silence. */
  setAmbience(_id: string | null): void {}
  duck(_amt: number, _t: number): void {}
  update(_dt: number): void {}
}
