import { HashRouter as BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ChooseNewDeckMethod from './pages/ChooseNewDeckMethod';
import NewDeck from './pages/NewDeck';
import TutorDeckChat from './pages/TutorDeckChat';
import DeckBuilder from './pages/DeckBuilder';
import DesignSystem from './pages/DesignSystem';
import { UpdateToast } from './components/UpdateToast';
import { DeckCloudSync } from './components/DeckCloudSync';
import { PasswordRecoveryGate } from './features/deck-builder/PasswordRecoveryGate';
import { useSupabaseSession } from './lib/useSupabaseSession';

export default function App() {
  const { isPasswordRecovery, clearPasswordRecovery } = useSupabaseSession();

  return (
    <BrowserRouter>
      <DeckCloudSync />
      {isPasswordRecovery && <PasswordRecoveryGate onDone={clearPasswordRecovery} />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new-deck" element={<ChooseNewDeckMethod />} />
        <Route path="/new-deck/manual" element={<NewDeck />} />
        <Route path="/new-deck/tutor" element={<TutorDeckChat />} />
        <Route path="/deck/:id" element={<DeckBuilder />} />
        <Route path="/design" element={<DesignSystem />} />
      </Routes>
      <UpdateToast />
    </BrowserRouter>
  );
}
