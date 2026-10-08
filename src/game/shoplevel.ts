// The shop gets better as you feed the donation box: every 50 buttons dropped in (across every run,
// it's kept in the save) raises the shop a level.

export const DONATION_STEP = 50;
/** What each shop level adds, in order. Level 0 is the shop as it starts. */
export const SHOP_LEVELS = [
  '',
  'shops stock an extra curio',
  'shop prices are 10% lower',
  'shops stock another extra curio',
  'shop prices are 20% lower',
  'one curio in every shop is a rare one',
];
export const MAX_SHOP_LEVEL = SHOP_LEVELS.length - 1;

export function shopLevelFor(donated: number): number { return Math.min(MAX_SHOP_LEVEL, Math.floor(Math.max(0, donated) / DONATION_STEP)); }
/** A price after the shop's discounts. */
export function shopPrice(base: number, level: number): number {
  const k = level >= 4 ? 0.8 : level >= 2 ? 0.9 : 1;
  return Math.max(1, Math.round(base * k));
}
/** Curios for sale in a shop at this level (the rest of the counter is pickups). */
export function shopCurios(floorIndex: number, level: number): number {
  return Math.min(4, (floorIndex >= 2 ? 2 : 1) + (level >= 1 ? 1 : 0) + (level >= 3 ? 1 : 0));
}
