// Unified keyboard + gamepad input with rebindable actions and per-step edge detection.
export type Action =
  | 'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight'
  | 'shootUp' | 'shootDown' | 'shootLeft' | 'shootRight'
  | 'active' | 'bomb' | 'consumable' | 'focus' | 'pause' | 'map' | 'drop' | 'swap';

export const ACTION_LABELS: Record<Action, string> = {
  moveUp: 'Move Up', moveDown: 'Move Down', moveLeft: 'Move Left', moveRight: 'Move Right',
  shootUp: 'Fire Up', shootDown: 'Fire Down', shootLeft: 'Fire Left', shootRight: 'Fire Right',
  active: 'Use Active Item / Interact', bomb: 'Cherry Bomb', consumable: 'Use Page / Sweet',
  focus: 'Steady (slow, precise)', pause: 'Pause', map: 'Map & Item Info', drop: 'Drop Charm', swap: 'Swap Consumable',
};
export const ACTION_ORDER: Action[] = [
  'moveUp', 'moveDown', 'moveLeft', 'moveRight', 'shootUp', 'shootDown', 'shootLeft', 'shootRight',
  'active', 'bomb', 'consumable', 'focus', 'map', 'drop', 'swap', 'pause',
];

export type Bindings = Record<Action, string[]>;
export const DEFAULT_BINDINGS: Bindings = {
  moveUp: ['KeyW'], moveDown: ['KeyS'], moveLeft: ['KeyA'], moveRight: ['KeyD'],
  shootUp: ['ArrowUp'], shootDown: ['ArrowDown'], shootLeft: ['ArrowLeft'], shootRight: ['ArrowRight'],
  active: ['KeyE'], bomb: ['Space'], consumable: ['KeyQ'], focus: ['ShiftLeft', 'ShiftRight'],
  pause: ['Escape', 'KeyP'], map: ['Tab'], drop: ['KeyR'], swap: ['KeyF'],
};

// Standard-mapping gamepad buttons per action (rebindable in Options -> Controls). The menus always
// use A to confirm, B to go back, the D-pad or left stick to move and the bumpers to turn pages.
export type PadBindings = Partial<Record<Action, number[]>>;
export const DEFAULT_PAD: PadBindings = {
  shootDown: [0], shootRight: [1], shootLeft: [2], shootUp: [3],
  bomb: [4], active: [5], consumable: [6], swap: [7], focus: [10], pause: [9], map: [8], drop: [11],
};
/** Buttons an action can be bound to: the face buttons, bumpers, triggers, View and the stick clicks (the D-pad stays for moving, Menu for pausing). */
export const PAD_BINDABLE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11];

/** The controller in hand, for its button names and glyphs. */
export type PadKind = 'xbox' | 'playstation' | 'nintendo' | 'deck';
const DPAD = ['D-pad Up', 'D-pad Down', 'D-pad Left', 'D-pad Right'];
export const PAD_LABELS: Record<PadKind, string[]> = {
  xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', ...DPAD],
  playstation: ['Cross', 'Circle', 'Square', 'Triangle', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', ...DPAD],
  // the standard mapping goes by position: the bottom face button is B on a Nintendo pad
  nintendo: ['B', 'A', 'Y', 'X', 'L', 'R', 'ZL', 'ZR', '-', '+', 'LS', 'RS', ...DPAD],
  deck: ['A', 'B', 'X', 'Y', 'L1', 'R1', 'L2', 'R2', 'View', 'Menu', 'L3', 'R3', ...DPAD],
};
/** Guess the family from the browser's gamepad id (vendor ids: Sony 054c, Nintendo 057e, Valve 28de). */
export function padKindFromId(id: string): PadKind {
  const s = id.toLowerCase();
  if (/054c|playstation|dualsense|dualshock|ps[345] controller/.test(s)) return 'playstation';
  if (/057e|nintendo|pro controller|joy-con/.test(s)) return 'nintendo';
  if (/steam deck|28de-1205/.test(s)) return 'deck';
  return 'xbox';
}

let liveInput: Input | null = null;
/** The live input (for drawing prompts without a reference to the game). */
export const currentInput = (): Input | null => liveInput;
export function padLabel(b: number, kind: PadKind = liveInput?.padKind ?? 'xbox'): string { return PAD_LABELS[kind][b] ?? `Button ${b}`; }
/** The first controller button bound to an action, if any. */
export function padButtonOf(a: Action): number | undefined { return (liveInput?.padBindings ?? DEFAULT_PAD)[a]?.[0]; }

/** What to press for an action right now: your own key binding, or the controller button when playing on a pad. */
export function bindLabel(a: Action): string {
  const inp = liveInput;
  if (inp?.usingPad) { const b = padButtonOf(a); if (b !== undefined) return padLabel(b); }
  const codes = inp?.bindings[a] ?? DEFAULT_BINDINGS[a];
  return codes.length ? keyLabel(codes[0]) : 'unbound';
}
/** Replace {action} placeholders in display text with the current control, e.g. "Place with {bomb}". */
export function fmtKeys(s: string): string {
  return s.replace(/\{(\w+)\}/g, (m, a) => (a in DEFAULT_BINDINGS ? bindLabel(a as Action) : m));
}

export type MenuKey = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'tabL' | 'tabR';

export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = {
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space', ShiftLeft: 'L-Shift',
    ShiftRight: 'R-Shift', ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl', Escape: 'Esc', Enter: 'Enter',
    Tab: 'Tab', Backspace: 'Bksp', AltLeft: 'L-Alt', AltRight: 'R-Alt', Semicolon: ';', Quote: "'",
    Comma: ',', Period: '.', Slash: '/', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=',
  };
  return map[code] ?? code.replace('Numpad', 'Num ');
}

export class Input {
  bindings: Bindings = structuredClone(DEFAULT_BINDINGS);
  diagonalAim = false;
  private down = new Set<string>();
  private pressed = new Set<string>();
  private shootOrder: Action[] = [];
  private padDown = new Set<number>();
  private padPrev = new Set<number>();
  private padPressed = new Set<number>();
  padAxes = [0, 0, 0, 0];
  usingPad = false;
  padBindings: PadBindings = structuredClone(DEFAULT_PAD);
  /** The family of the controller in use (button names and glyphs). */
  padKind: PadKind = 'xbox';
  private padId = '';
  /** Asked when a controller connects: the real family if something knows better (Steam Input, a Steam Deck). */
  padKindHint: ((id: string) => PadKind | null) | null = null;
  /** When set, the next controller button press is delivered here instead of to actions (for rebinding). */
  captureNextPad: ((button: number) => void) | null = null;
  /** When set, the next keydown is delivered here instead of to actions (for rebinding). */
  captureNext: ((code: string) => void) | null = null;
  textCapture: ((key: string) => void) | null = null;
  private menuQueue: MenuKey[] = [];
  private padRepeat = 0;
  private padMenuDir: MenuKey | null = null;
  anyKeyPressed = false;
  /** When the mouse last moved or clicked (performance.now()), for hiding an idle cursor. */
  lastMouse = 0;
  /** Mouse in virtual (480x270) coordinates; `clicked` is set for one menu update. */
  mouse = { x: -1, y: -1, moved: false, clicked: false, down: false, wheel: 0, active: false };
  /** Converts client pixels to virtual coordinates (set by the game, which knows the scaling). */
  toView: ((cx: number, cy: number) => [number, number]) | null = null;

  constructor(target: HTMLElement) {
    liveInput = this;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' || e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      this.usingPad = false;
      this.anyKeyPressed = true;
      if (this.captureNext) { const cb = this.captureNext; this.captureNext = null; cb(e.code); e.preventDefault(); return; }
      // while typing (a seed), keys go to the text only: Enter/Esc end it without also acting in the menu
      if (this.textCapture) { this.textCapture(e.key); e.preventDefault(); this.down.add(e.code); return; }
      if (!this.down.has(e.code)) {
        this.pressed.add(e.code);
        const m = this.codeToMenu(e.code);
        if (m) this.menuQueue.push(m);
      }
      this.down.add(e.code);
      for (const a of ['shootUp', 'shootDown', 'shootLeft', 'shootRight'] as Action[]) {
        if (this.bindings[a].includes(e.code)) {
          this.shootOrder = this.shootOrder.filter((x) => x !== a);
          this.shootOrder.push(a);
        }
      }
    });
    window.addEventListener('keyup', (e) => { this.down.delete(e.code); });
    window.addEventListener('blur', () => this.reset());
    target.addEventListener('mousedown', () => target.focus());
    const pos = (e: PointerEvent | MouseEvent) => { if (this.toView) { const [x, y] = this.toView(e.clientX, e.clientY); this.mouse.x = x; this.mouse.y = y; } };
    // the mouse in use means keyboard-and-mouse prompts again
    target.addEventListener('pointermove', (e) => { pos(e); this.mouse.moved = true; this.mouse.active = true; this.usingPad = false; this.lastMouse = performance.now(); });
    target.addEventListener('pointerdown', (e) => { pos(e); this.usingPad = false; this.lastMouse = performance.now(); if (e.button === 0) { this.mouse.down = true; this.mouse.clicked = true; this.mouse.active = true; } });
    window.addEventListener('pointerup', () => { this.mouse.down = false; });
    target.addEventListener('wheel', (e) => { this.mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
    target.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Forget held controls and queued actions when play is interrupted. */
  reset(): void {
    this.down.clear(); this.pressed.clear(); this.shootOrder = [];
    this.padDown.clear(); this.padPrev.clear(); this.padPressed.clear();
    this.padAxes = [0, 0, 0, 0]; this.padRepeat = 0; this.padMenuDir = null;
    this.clearMenu(); this.anyKeyPressed = false;
    this.mouse.down = false; this.mouse.clicked = false; this.mouse.wheel = 0;
  }

  private codeToMenu(code: string): MenuKey | null {
    switch (code) {
      case 'ArrowUp': case 'KeyW': return 'up';
      case 'ArrowDown': case 'KeyS': return 'down';
      case 'ArrowLeft': case 'KeyA': return 'left';
      case 'ArrowRight': case 'KeyD': return 'right';
      case 'Enter': case 'Space': case 'KeyE': case 'NumpadEnter': return 'confirm';
      case 'Escape': case 'Backspace': return 'back';
      case 'KeyQ': return 'tabL';
      case 'KeyR': return 'tabR';
    }
    return null;
  }

  /** Poll gamepads; call once per rendered frame. */
  /** Controller rumble strength 0..1 (Options); 0 turns it off. */
  rumbleScale = 1;
  private rumbleUntil = 0; private rumbleNow = 0;
  /** A short rumble on the first connected pad, if it can; the strongest wins while one is playing. */
  rumble(strength: number, ms: number): void {
    if (!this.usingPad || this.rumbleScale <= 0) return;
    const now = performance.now(), k = Math.min(1, strength) * this.rumbleScale;
    if (now < this.rumbleUntil && k <= this.rumbleNow) return;
    const pad = (navigator.getGamepads ? [...navigator.getGamepads()] : []).find((p) => p && p.connected) as (Gamepad & { vibrationActuator?: { playEffect?(t: string, o: object): Promise<unknown> } }) | undefined;
    const act = pad?.vibrationActuator;
    if (!act?.playEffect) return;
    this.rumbleUntil = now + ms; this.rumbleNow = k;
    act.playEffect('dual-rumble', { duration: ms, strongMagnitude: k, weakMagnitude: Math.min(1, k * 1.2) }).catch(() => {});
  }
  pollPad(dt: number): void {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad: Gamepad | null = null;
    for (const p of pads) if (p && p.connected) { pad = p; break; }
    this.padPrev = this.padDown;
    this.padDown = new Set();
    if (!pad) { this.padAxes = [0, 0, 0, 0]; return; }
    if (pad.id !== this.padId) { this.padId = pad.id; this.refreshPadKind(); }
    pad.buttons.forEach((b, i) => { if (b.pressed || b.value > 0.5) this.padDown.add(i); });
    for (let i = 0; i < 4; i++) {
      const v = pad.axes[i] ?? 0;
      this.padAxes[i] = Math.abs(v) < 0.2 ? 0 : v;
    }
    for (const b of this.padDown) if (!this.padPrev.has(b)) {
      if (this.captureNextPad) {
        this.usingPad = true;
        if (!PAD_BINDABLE.includes(b)) continue;
        const cb = this.captureNextPad; this.captureNextPad = null; cb(b); continue;
      }
      this.padPressed.add(b); this.usingPad = true; this.anyKeyPressed = true;
      const m: MenuKey | null = b === 12 ? 'up' : b === 13 ? 'down' : b === 14 ? 'left' : b === 15 ? 'right'
        : b === 0 ? 'confirm' : b === 1 ? 'back' : b === 9 ? 'back' : b === 4 ? 'tabL' : b === 5 ? 'tabR' : null;
      if (m) this.menuQueue.push(m);
    }
    // Analog stick menu navigation with repeat.
    const ax = this.padAxes[0], ay = this.padAxes[1];
    let dir: MenuKey | null = null;
    if (Math.abs(ay) > 0.6 && Math.abs(ay) >= Math.abs(ax)) dir = ay < 0 ? 'up' : 'down';
    else if (Math.abs(ax) > 0.6) dir = ax < 0 ? 'left' : 'right';
    if (dir) {
      this.usingPad = true;
      if (dir !== this.padMenuDir) { this.menuQueue.push(dir); this.padRepeat = 0.35; }
      else { this.padRepeat -= dt; if (this.padRepeat <= 0) { this.menuQueue.push(dir); this.padRepeat = 0.1; } }
    }
    this.padMenuDir = dir;
  }

  /** Work out which controller family is in hand (call again if the hint's answer may have changed). */
  refreshPadKind(): void {
    let k: PadKind | null = null;
    try { k = this.padKindHint?.(this.padId) ?? null; } catch { k = null; }
    this.padKind = k ?? padKindFromId(this.padId);
  }
  /** Buttons for an action; Start always pauses, so a rebind can never leave the game without a pause button. */
  private padFor(a: Action): number[] {
    const pb = this.padBindings[a] ?? [];
    return a === 'pause' && !pb.includes(9) ? [...pb, 9] : pb;
  }
  isDown(a: Action): boolean {
    for (const c of this.bindings[a]) if (this.down.has(c)) return true;
    for (const b of this.padFor(a)) if (this.padDown.has(b)) return true;
    return false;
  }
  wasPressed(a: Action): boolean {
    for (const c of this.bindings[a]) if (this.pressed.has(c)) return true;
    for (const b of this.padFor(a)) if (this.padPressed.has(b)) return true;
    return false;
  }
  /** Called after each fixed simulation step to consume edge-triggered presses. */
  endStep(): void { this.pressed.clear(); this.padPressed.clear(); }
  /** Menu navigation keys pressed since last call. */
  takeMenu(): MenuKey[] { const q = this.menuQueue; this.menuQueue = []; return q; }
  /** Mouse state for this menu update; resets the one-shot flags. */
  takeMouse(): { x: number; y: number; moved: boolean; clicked: boolean; wheel: number } { const m = { ...this.mouse }; this.mouse.moved = false; this.mouse.clicked = false; this.mouse.wheel = 0; return m; }
  clearMenu(): void { this.menuQueue = []; }

  moveVector(): { x: number; y: number } {
    let x = 0, y = 0;
    if (this.isDown('moveLeft')) x -= 1;
    if (this.isDown('moveRight')) x += 1;
    if (this.isDown('moveUp')) y -= 1;
    if (this.isDown('moveDown')) y += 1;
    if (x === 0 && y === 0) {
      x = this.padAxes[0]; y = this.padAxes[1];
      if (!(this.padDown.has(12) || this.padDown.has(13) || this.padDown.has(14) || this.padDown.has(15))) {
        const l = Math.hypot(x, y);
        if (l > 1) { x /= l; y /= l; }
        return { x, y };
      }
      x = (this.padDown.has(15) ? 1 : 0) - (this.padDown.has(14) ? 1 : 0);
      y = (this.padDown.has(13) ? 1 : 0) - (this.padDown.has(12) ? 1 : 0);
    }
    const l = Math.hypot(x, y);
    return l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  }

  /** Aim direction or null when not firing. Analog aim on the right stick is free-angle. */
  aimVector(): { x: number; y: number } | null {
    const rx = this.padAxes[2], ry = this.padAxes[3];
    if (Math.hypot(rx, ry) > 0.45) { const l = Math.hypot(rx, ry); return { x: rx / l, y: ry / l }; }
    const held = (['shootUp', 'shootDown', 'shootLeft', 'shootRight'] as Action[]).filter((a) => this.isDown(a));
    if (held.length === 0) { return null; }
    if (this.diagonalAim) {
      let x = 0, y = 0;
      if (held.includes('shootLeft')) x -= 1;
      if (held.includes('shootRight')) x += 1;
      if (held.includes('shootUp')) y -= 1;
      if (held.includes('shootDown')) y += 1;
      const l = Math.hypot(x, y);
      if (l > 0) return { x: x / l, y: y / l };
    }
    // Last pressed held key wins.
    let pick: Action | undefined;
    for (let i = this.shootOrder.length - 1; i >= 0; i--) if (held.includes(this.shootOrder[i])) { pick = this.shootOrder[i]; break; }
    if (!pick) pick = held[held.length - 1];
    switch (pick) {
      case 'shootUp': return { x: 0, y: -1 };
      case 'shootDown': return { x: 0, y: 1 };
      case 'shootLeft': return { x: -1, y: 0 };
      default: return { x: 1, y: 0 };
    }
  }
  bindingLabel(a: Action): string { return this.bindings[a].map(keyLabel).join(' / '); }
}
