import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

const CHECK_INTERVAL_MS = 60_000;

export function UpdateToast() {
  const [available, setAvailable] = React.useState(false);

  React.useEffect(() => {
    let stopped = false;

    async function check() {
      try {
        const res = await fetch(
          `${import.meta.env.BASE_URL}version.json?_=${Date.now()}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!stopped && data?.sha && data.sha !== __BUILD_SHA__) {
          setAvailable(true);
        }
      } catch {
        /* offline or blocked — ignore */
      }
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <AnimatePresence>
      {available && (
        <motion.div
          initial={{ y: 80, x: '-50%', opacity: 0 }}
          animate={{ y: 0, x: '-50%', opacity: 1 }}
          exit={{ y: 80, x: '-50%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          style={{
            position: 'fixed',
            bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            left: '50%',
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px 10px 16px',
            backgroundColor: 'rgba(28, 28, 30, 0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '999px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>
            Nova versão disponível
          </span>
          <button
            onClick={() => window.location.reload()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '999px',
              backgroundColor: 'var(--accent)',
              color: '#0f0f0f',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <RefreshCw size={12} />
            Atualizar
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
