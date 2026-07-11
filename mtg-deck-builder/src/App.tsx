import { HashRouter as BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import NewDeck from './pages/NewDeck';
import DeckBuilder from './pages/DeckBuilder';
import DesignSystem from './pages/DesignSystem';
import { UpdateToast } from './components/UpdateToast';
import { DeckCloudSync } from './components/DeckCloudSync';

export default function App() {
  return (
    <BrowserRouter>
      <DeckCloudSync />
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
