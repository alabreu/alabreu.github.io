import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { loadAccentPreview } from './design-system/accentPreview';
import { loadFlameTint } from './design-system/flameTint';
import { loadFlameSpeed } from './design-system/flameSpeed';
import { SessionProvider } from './lib/useSupabaseSession';

// Re-applies a saved accent-color preview (from the Design System page)
// before first paint, so testing a color survives reloads without a flash
// of the default gold.
loadAccentPreview();
loadFlameTint();
loadFlameSpeed();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </React.StrictMode>
);
