// Kept free of imports: pickups, the HUD and the run code all read it, and the item registry
// must not be pulled in early by it.
/** A sweet's colour as a safe index 0-11 (old saves can hold sweets with none). */
export function sweetColor(color: unknown): number { const c = Math.floor(Number(color)); return Number.isFinite(c) ? ((c % 12) + 12) % 12 : 0; }
