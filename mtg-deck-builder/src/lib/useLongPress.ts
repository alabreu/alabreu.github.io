import React from 'react';

interface Options {
  /** Fired once the press is held past `delay` without moving. */
  onLongPress: () => void;
  /** Normal tap. Skipped when the press became a long press. */
  onClick?: () => void;
  /** Hold duration in ms. 500 matches the platform convention. */
  delay?: number;
  /** Movement (px) that cancels the press — so scrolling never fires it. */
  moveTolerance?: number;
}

/**
 * Long-press ("press and hold") on touch and mouse, built on pointer events.
 *
 * Spread the returned props onto the pressable element. `onClickCapture` is
 * part of them on purpose: it swallows the click that the browser fires after
 * a long press, in the capture phase, so a nested handler (e.g. a card image's
 * own onClick) doesn't also run.
 */
export function useLongPress({ onLongPress, onClick, delay = 500, moveTolerance = 10 }: Options) {
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = React.useRef<{ x: number; y: number } | null>(null);
  const fired = React.useRef(false);

  // Keep the latest callbacks without re-creating the handlers on every render.
  const cbs = React.useRef({ onLongPress, onClick });
  cbs.current = { onLongPress, onClick };

  const cancel = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
  }, []);

  React.useEffect(() => cancel, [cancel]);

  return React.useMemo(
    () => ({
      onPointerDown(e: React.PointerEvent) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        fired.current = false;
        origin.current = { x: e.clientX, y: e.clientY };
        timer.current = setTimeout(() => {
          timer.current = null;
          fired.current = true;
          // Android gives real feedback; iOS ignores it silently.
          navigator.vibrate?.(12);
          cbs.current.onLongPress();
        }, delay);
      },
      onPointerMove(e: React.PointerEvent) {
        if (!origin.current) return;
        const dx = e.clientX - origin.current.x;
        const dy = e.clientY - origin.current.y;
        if (Math.hypot(dx, dy) > moveTolerance) cancel();
      },
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onPointerLeave: cancel,
      onClickCapture(e: React.MouseEvent) {
        if (fired.current) {
          // The hold already acted; block the trailing click entirely.
          fired.current = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        cbs.current.onClick?.();
      },
      // Suppress iOS's callout/selection bubble on a held element.
      onContextMenu(e: React.MouseEvent) {
        e.preventDefault();
      },
      style: {
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      } as React.CSSProperties,
    }),
    [cancel, delay, moveTolerance]
  );
}
