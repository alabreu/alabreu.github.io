import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { loadAccentPreview } from './design-system/accentPreview';

// Re-applies a saved accent-color preview (from the Design System page)
// before first paint, so testing a color survives reloads without a flash
// of the default gold.
loadAccentPreview();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
