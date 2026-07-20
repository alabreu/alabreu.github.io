import React from 'react';
import { HashRouter as BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ChooseNewDeckMethod from './pages/ChooseNewDeckMethod';
import NewDeck from './pages/NewDeck';
import TutorDeckChat from './pages/TutorDeckChat';
import DeckBuilder from './pages/DeckBuilder';
import DesignSystem from './pages/DesignSystem';

// Admin dashboard is code-split so its charts/telemetry code never ships in the
// bundle regular users download.
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
// Legal pages are static text — code-split so they don't weigh down the app.
const TermsPage = React.lazy(() => import('./pages/legal/TermsPage'));
const PrivacyPage = React.lazy(() => import('./pages/legal/PrivacyPage'));
const FaqPage = React.lazy(() => import('./pages/legal/FaqPage'));
import { UpdateToast } from './components/UpdateToast';
import { DeckCloudSync } from './components/DeckCloudSync';
import { TermsConsentSync } from './components/TermsConsentSync';
import { NoiseOverlay } from './components/NoiseOverlay';
import { PasswordRecoveryGate } from './features/deck-builder/PasswordRecoveryGate';
import { useSupabaseSession } from './lib/useSupabaseSession';
import { LanguageProvider } from './lib/i18n';

export default function App() {
  const { isPasswordRecovery, clearPasswordRecovery } = useSupabaseSession();

  // During password recovery, render ONLY the gate — not the routes or
  // DeckCloudSync — so the rest of the app doesn't run (and sync) behind the
  // overlay in a recovery-mode session. The gate has no router dependency.
  if (isPasswordRecovery) {
    return (
      <LanguageProvider>
        <PasswordRecoveryGate onDone={clearPasswordRecovery} />
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <BrowserRouter>
        <DeckCloudSync />
        <TermsConsentSync />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new-deck" element={<ChooseNewDeckMethod />} />
          <Route path="/new-deck/manual" element={<NewDeck />} />
          <Route path="/new-deck/tutor" element={<TutorDeckChat />} />
          <Route path="/deck/:id" element={<DeckBuilder />} />
          <Route path="/design" element={<DesignSystem />} />
          <Route path="/termos" element={<React.Suspense fallback={null}><TermsPage /></React.Suspense>} />
          <Route path="/privacidade" element={<React.Suspense fallback={null}><PrivacyPage /></React.Suspense>} />
          <Route path="/faq" element={<React.Suspense fallback={null}><FaqPage /></React.Suspense>} />
          <Route path="/ajuda" element={<React.Suspense fallback={null}><FaqPage /></React.Suspense>} />
          {/* English aliases pointing at the same (pt-BR) documents for now. */}
          <Route path="/terms" element={<React.Suspense fallback={null}><TermsPage /></React.Suspense>} />
          <Route path="/privacy" element={<React.Suspense fallback={null}><PrivacyPage /></React.Suspense>} />
          <Route
            path="/admin"
            element={
              <React.Suspense fallback={null}>
                <AdminDashboard />
              </React.Suspense>
            }
          />
        </Routes>
        <UpdateToast />
        <NoiseOverlay />
      </BrowserRouter>
    </LanguageProvider>
  );
}
