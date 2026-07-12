import { HashRouter as BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import NewDeck from './pages/NewDeck';
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
        <Route path="/new-deck" element={<NewDeck />} />
        <Route path="/deck/:id" element={<DeckBuilder />} />
        <Route path="/design" element={<DesignSystem />} />
      </Routes>
      <UpdateToast />
    </BrowserRouter>
  );
}
