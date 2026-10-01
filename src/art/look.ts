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
  /** Palette overrides on Marcus's rig (hair K h H L l, skin S s d W, eyes e w v, hoodie c C D E, lining R q, jeans j J, shoes n N x, ink tear k). */
  pal?: Record<string, string>;
  /** Reshape the hair: shaved to the skin, or pulled up into a hood. */
  headMod?: 'bald' | 'hood';
  /** Pieces that are part of who they are (braids, a beard, goggles), drawn like costume accessories. */
  acc?: string[];
}
const noTear = (skin: string) => ({ k: skin });
/**
 * Every reader is drawn on Marcus's hand-drawn rig, the way Isaac's cast all share his body: their own
 * colours, hair and the odd accessory on top.
 */
export const LOOKS: Record<string, CharacterLook> = {
  marcus: { skin: '#f1c7a1', hair: '#4a2a1c', eye: '#1c1628', shirt: '#2f7a70', trim: '#d9b25f', shorts: '#40324e',
    sockL: '#b8323a', sockR: '#e8e2d4', shoe: '#5b3a2a', hairStyle: 'messy', extra: 'ink', hand: 'marcus' },
  wren: { skin: '#d9a079', hair: '#c9612c', eye: '#23162a', shirt: '#6b4a8c', trim: '#e0d3b5', shorts: '#2e3a52',
    sockL: '#e8e2d4', sockR: '#e8e2d4', shoe: '#3a2a22', hairStyle: 'braid', extra: 'bandage', hand: 'marcus',
    pal: { K: '#5a1e0a', h: '#7a2e10', H: '#a8461a', L: '#d06a2a', l: '#f0a050', S: '#f0c8a0', s: '#d8a47c', d: '#b07a5a', W: '#fff0e0', v: '#5a9a3a',
      c: '#2a1e3e', C: '#4a3470', D: '#6b4a8c', E: '#8a6aaa', R: '#e0d3b5', q: '#a8946e', t: '#f0e8d0', j: '#2e3a52', J: '#46587a', x: '#3a2a22', ...noTear('#f0c8a0') },
    acc: ['braidRed', 'plaster'] },
  elias: { skin: '#b9d2de', hair: '#e7eef2', eye: '#1a2a3a', shirt: '#5a6c86', trim: '#c9d8e2', shorts: '#394a5e',
    sockL: '#8fa6b8', sockR: '#8fa6b8', shoe: '#3b4a5a', hairStyle: 'bald', extra: 'glasses', beard: true, ghost: true, hand: 'marcus',
    pal: { K: '#7a8894', h: '#98a8b4', H: '#b8c8d2', L: '#dce6ee', l: '#ffffff', S: '#cfe0ea', s: '#a8c0cc', d: '#86a0b0', W: '#f0f8ff', v: '#6a8aaa', r: '#b8d0e0',
      c: '#2a3444', C: '#3e4c62', D: '#5a6c86', E: '#7a8ca6', R: '#c9d8e2', q: '#8a9aaa', j: '#394a5e', J: '#4e6276', n: '#c8d4dc', x: '#3b4a5a', ...noTear('#cfe0ea') },
    acc: ['beardWhite', 'glasses'] },
  edda: { skin: '#e9c3a8', hair: '#1f1a26', eye: '#2a1420', shirt: '#9b3b4f', trim: '#e6cf8a', shorts: '#2a2230',
    sockL: '#2a2230', sockR: '#2a2230', shoe: '#1f1a20', hairStyle: 'bob', extra: 'none', hand: 'marcus',
    pal: { K: '#06050a', h: '#0e0c14', H: '#1a1622', L: '#34304a', l: '#5a5476', S: '#f4d6c0', s: '#e0b49c', d: '#c0907a', v: '#8a2a3a',
      c: '#4a1424', C: '#7a2a3a', D: '#9b3b4f', E: '#b85a6a', R: '#e6cf8a', q: '#a88a40', t: '#e6cf8a', j: '#2a2230', J: '#3a3044', n: '#2a2230', N: '#1a1420', x: '#100c14', ...noTear('#f4d6c0') },
    acc: ['bobBlack', 'needleHair'] },
  blot: { skin: '#1a1830', hair: '#0e0c1c', eye: '#f2f0ff', shirt: '#26234a', trim: '#6a64b8', shorts: '#15132a',
    sockL: '#26234a', sockR: '#26234a', shoe: '#0e0c1c', hairStyle: 'blot', extra: 'none', hand: 'marcus',
    pal: { o: '#05030a', K: '#05040a', h: '#0c0a18', H: '#14122a', L: '#2a2650', l: '#4a4490', S: '#1e1c38', s: '#16142c', d: '#100e20', W: '#2a2850',
      e: '#f2f0ff', w: '#ffffff', v: '#b8b0ff', m: '#05030a', r: '#2a2650', k: '#6a64b8',
      c: '#0e0c1c', C: '#1a1830', D: '#26234a', E: '#3a3670', R: '#6a64b8', q: '#3a3670', t: '#6a64b8', j: '#14122a', J: '#1e1c38', n: '#26234a', N: '#1a1830', x: '#0e0c1c' },
    acc: ['inkHorns'] },
  ozzie: { skin: '#e0b088', hair: '#2a2622', eye: '#1c1628', shirt: '#2f6a3a', trim: '#e8c050', shorts: '#2a2a3a',
    sockL: '#e8e2d4', sockR: '#e8c050', shoe: '#3a2a22', hairStyle: 'messy', extra: 'goggles', hand: 'marcus',
    pal: { K: '#100e0c', h: '#1a1612', H: '#2a2420', L: '#4a4038', l: '#6a5a4a', S: '#ecc098', s: '#d4a078', d: '#b07c5a', v: '#3a6a8a',
      c: '#1a3a20', C: '#2f6a3a', D: '#3f8a4a', E: '#5aa860', R: '#e8c050', q: '#a88a30', t: '#e8c050', j: '#2a2a3a', J: '#3e3e54', n: '#e8c050', N: '#b89830', ...noTear('#ecc098') },
    acc: ['goggles'] },
  nell: { skin: '#f0cfa8', hair: '#d8a848', eye: '#2a1a14', shirt: '#c06a2a', trim: '#ffe8a0', shorts: '#3a2a22',
    sockL: '#e8e2d4', sockR: '#e8e2d4', shoe: '#4a2a1a', hairStyle: 'braid', extra: 'none', hand: 'marcus',
    pal: { K: '#6a4a14', h: '#8a6420', H: '#b08030', L: '#d8a848', l: '#f8d878', S: '#f6dcbc', s: '#e2b894', d: '#c4946e', v: '#6a4a2a',
      c: '#5a2a0e', C: '#8a4418', D: '#c06a2a', E: '#d88a4a', R: '#ffe8a0', q: '#c8a050', t: '#ffe8a0', j: '#3a2a22', J: '#54402e', x: '#4a2a1a', ...noTear('#f6dcbc') },
    acc: ['braidGold'] },
  bram: { skin: '#c88a60', hair: '#3a1e10', eye: '#1a1010', shirt: '#7a2a2a', trim: '#c8a060', shorts: '#2a2a30',
    sockL: '#2a2a30', sockR: '#2a2a30', shoe: '#1a1414', hairStyle: 'bald', extra: 'bandage', hand: 'marcus', headMod: 'bald',
    pal: { S: '#d0946a', s: '#b07450', d: '#8a5838', W: '#e8b088', v: '#3a2a1a', r: '#c06a5a',
      c: '#3a1010', C: '#5a1a1a', D: '#7a2a2a', E: '#9a3a3a', R: '#c8a060', q: '#8a6a3a', t: '#c8a060', j: '#2a2a30', J: '#3a3a44', n: '#3a3a44', N: '#2a2a30', x: '#1a1414', ...noTear('#d0946a') },
    acc: ['headBandage'] },
  ada: { skin: '#e8d4c8', hair: '#c8c4cc', eye: '#2a2a3a', shirt: '#3a6a4a', trim: '#e8b0c0', shorts: '#4a3a4a',
    sockL: '#d8c8b8', sockR: '#d8c8b8', shoe: '#4a2a2a', hairStyle: 'bob', extra: 'glasses', ghost: true, hand: 'marcus',
    pal: { K: '#5a5660', h: '#7a7680', H: '#a09ca8', L: '#c8c4cc', l: '#ece8f0', S: '#f0e0d4', s: '#dcc4b4', d: '#bca494', v: '#4a6a5a', r: '#e8b0b8',
      c: '#1e3a2a', C: '#2e5a3e', D: '#3a6a4a', E: '#5a8a6a', R: '#e8b0c0', q: '#b8808a', t: '#e8b0c0', j: '#4a3a4a', J: '#5e4c5e', n: '#d8c8b8', x: '#4a2a2a', ...noTear('#f0e0d4') },
    acc: ['bobGrey', 'glasses'] },
  wick: { skin: '#dcd4c4', hair: '#8a7a64', eye: '#1a1410', shirt: '#8a7a5a', trim: '#e0d0a8', shorts: '#4a4030',
    sockL: '#8a7a5a', sockR: '#8a7a5a', shoe: '#3a3024', hairStyle: 'hood', extra: 'none', hand: 'marcus', headMod: 'hood',
    pal: { S: '#e4dccc', s: '#ccc2ae', d: '#aa9e88', v: '#c8a040', e: '#1a1410', r: '#d8c8b0',
      c: '#3a3024', C: '#5a4c38', D: '#8a7a5a', E: '#a8987a', R: '#e0d0a8', q: '#a8987a', t: '#e0d0a8', j: '#4a4030', J: '#5e5440', n: '#8a7a5a', N: '#6a5c44', x: '#3a3024', ...noTear('#e4dccc') },
    acc: ['antennae'] },
};
