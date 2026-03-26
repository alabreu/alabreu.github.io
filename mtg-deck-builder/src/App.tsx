import { HashRouter as BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import DeckBuilder from './pages/DeckBuilder';
import DesignSystem from './pages/DesignSystem';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/deck/:id" element={<DeckBuilder />} />
        <Route path="/design" element={<DesignSystem />} />
      </Routes>
    </BrowserRouter>
  );
}
