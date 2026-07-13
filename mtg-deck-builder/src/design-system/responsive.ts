/** The app is mobile-first; on wider screens the content is capped and
 *  centered into a phone-proportioned column instead of stretching
 *  full-bleed. `edgeInset` gives fixed-position elements (floating
 *  buttons, bottom bars) the matching left/right offset so they stay
 *  aligned to the column's edges — on narrow viewports it resolves to
 *  the plain pixel value (unchanged mobile behavior). */
export const CONTENT_MAX_WIDTH = 640;

export function edgeInset(px: number): string {
  return `max(${px}px, calc(50vw - ${CONTENT_MAX_WIDTH / 2}px + ${px}px))`;
}
