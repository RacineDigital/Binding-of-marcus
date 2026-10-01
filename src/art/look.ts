// Character look parameters so one rig renders every playable character.
export interface CharacterLook {
  skin: string; hair: string; eye: string; shirt: string; trim: string; shorts: string;
  sockL: string; sockR: string; shoe: string;
  hairStyle: 'messy' | 'bob' | 'bald' | 'hood' | 'blot' | 'braid';
  extra?: 'ink' | 'glasses' | 'bandage' | 'goggles' | 'none';
  beard?: boolean;
  ghost?: boolean;
  /** Hand-drawn rig id; overrides the procedural painter. */
  hand?: 'marcus';
}
export const LOOKS: Record<string, CharacterLook> = {
  marcus: { skin: '#f1c7a1', hair: '#4a2a1c', eye: '#1c1628', shirt: '#2f7a70', trim: '#d9b25f', shorts: '#40324e',
    sockL: '#b8323a', sockR: '#e8e2d4', shoe: '#5b3a2a', hairStyle: 'messy', extra: 'ink', hand: 'marcus' },
  wren: { skin: '#d9a079', hair: '#c9612c', eye: '#23162a', shirt: '#6b4a8c', trim: '#e0d3b5', shorts: '#2e3a52',
    sockL: '#e8e2d4', sockR: '#e8e2d4', shoe: '#3a2a22', hairStyle: 'braid', extra: 'bandage' },
  elias: { skin: '#b9d2de', hair: '#e7eef2', eye: '#1a2a3a', shirt: '#5a6c86', trim: '#c9d8e2', shorts: '#394a5e',
    sockL: '#8fa6b8', sockR: '#8fa6b8', shoe: '#3b4a5a', hairStyle: 'bald', extra: 'glasses', beard: true, ghost: true },
  edda: { skin: '#e9c3a8', hair: '#1f1a26', eye: '#2a1420', shirt: '#9b3b4f', trim: '#e6cf8a', shorts: '#2a2230',
    sockL: '#2a2230', sockR: '#2a2230', shoe: '#1f1a20', hairStyle: 'bob', extra: 'none' },
  blot: { skin: '#1a1830', hair: '#0e0c1c', eye: '#f2f0ff', shirt: '#26234a', trim: '#6a64b8', shorts: '#15132a',
    sockL: '#26234a', sockR: '#26234a', shoe: '#0e0c1c', hairStyle: 'blot', extra: 'none' },
};
