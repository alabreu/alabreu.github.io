import { HashRouter as BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ChooseNewDeckMethod from './pages/ChooseNewDeckMethod';
import NewDeck from './pages/NewDeck';
import TutorDeckChat from './pages/TutorDeckChat';
import DeckBuilder from './pages/DeckBuilder';
import DesignSystem from './pages/DesignSystem';
import { UpdateToast } from './components/UpdateToast';
import { DeckCloudSync } from './components/DeckCloudSync';
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new-deck" element={<ChooseNewDeckMethod />} />
          <Route path="/new-deck/manual" element={<NewDeck />} />
          <Route path="/new-deck/tutor" element={<TutorDeckChat />} />
          <Route path="/deck/:id" element={<DeckBuilder />} />
          <Route path="/design" element={<DesignSystem />} />
        </Routes>
        <UpdateToast />
        <NoiseOverlay />
      </BrowserRouter>
    </LanguageProvider>
  );
}
