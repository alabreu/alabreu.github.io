import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { edgeInset } from '../responsive';
import { NoiseOverlay } from '../../components/NoiseOverlay';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxHeight?: string;
  /** Optional element rendered in the header row, before the close button */
  headerAction?: React.ReactNode;
}

// Ref-count of open sheets so the body scroll lock isn't released while another
// sheet is still open (or re-locked out of order) when sheets overlap.
let openSheetCount = 0;
function lockBodyScroll() {
  if (openSheetCount === 0) document.body.style.overflow = 'hidden';
  openSheetCount++;
}
function unlockBodyScroll() {
  openSheetCount = Math.max(0, openSheetCount - 1);
  if (openSheetCount === 0) document.body.style.overflow = '';
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  maxHeight = '90dvh',
  headerAction,
}: BottomSheetProps) {
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const startY = React.useRef<number | null>(null);
  const currentY = React.useRef<number>(0);
  const titleId = React.useId();
  const closeOnRef = React.useRef(onClose);
  closeOnRef.current = onClose;

  // Lock body scroll while open (ref-counted), close on Escape, and move focus
  // into the sheet on open / restore it to the trigger on close.
  React.useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Focus the panel so keyboard/screen-reader users land inside the dialog.
    const focusTimer = setTimeout(() => sheetRef.current?.focus(), 0);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeOnRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      unlockBodyScroll();
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    currentY.current = delta;
    if (sheetRef.current && delta > 0) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
    if (currentY.current > 100) {
      onClose();
    }
    startY.current = null;
    currentY.current = 0;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, pointerEvents: 'auto' }}
            // Stop intercepting taps the moment the sheet starts leaving. This
            // is both better feel (a fading backdrop shouldn't swallow a tap)
            // and a safety net: if the exit animation ever fails to complete
            // and the node lingers, an invisible full-screen backdrop would
            // otherwise freeze the whole app until reload.
            exit={{ opacity: 0, pointerEvents: 'none' }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 50,
            }}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0, pointerEvents: 'auto' }}
            // Same guard as the backdrop: a leaving panel must not keep
            // capturing taps over the content behind it.
            exit={{ y: '100%', pointerEvents: 'none' }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 32,
              mass: 0.8,
            }}
            style={{
              outline: 'none',
              position: 'fixed',
              bottom: 0,
              left: edgeInset(0),
              right: edgeInset(0),
              maxHeight: `min(${maxHeight}, calc(100dvh - env(safe-area-inset-top, 0px) - 12px))`,
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
              border: '1px solid var(--border-default)',
              borderBottom: 'none',
              boxShadow: 'var(--shadow-xl)',
              zIndex: 51,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Drag handle area */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                flexShrink: 0,
                padding: '12px 16px 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                cursor: 'grab',
                touchAction: 'none',
              }}
            >
              {/* Handle pill */}
              <div
                style={{
                  width: '36px',
                  height: '4px',
                  backgroundColor: 'var(--border-strong)',
                  borderRadius: 'var(--radius-full)',
                }}
              />

              {/* Header row */}
              {title && (
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '12px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <span
                    id={titleId}
                    style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {title}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {headerAction}
                    <button
                      onClick={onClose}
                      aria-label="Fechar"
                      style={{
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'var(--surface-2)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-full)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                paddingBottom: 'env(safe-area-inset-bottom, 16px)',
              }}
            >
              {children}
            </div>

            {/* Scoped to this sheet's own surface — the global page grain
                (App.tsx) sits below the sheet backdrop, so without this the
                sheet would look grain-free while it's open. */}
            <NoiseOverlay style={{ position: 'absolute', zIndex: 2 }} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
