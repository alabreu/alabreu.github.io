import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, List, Search, Bot, MoreHorizontal, Trash2, FileInput, LayoutList, ChevronsUpDown, Cpu } from 'lucide-react';
import { useDrag } from '@use-gesture/react';
import { useDeckStore } from '../store/useDeckStore';
import { BottomSheet } from '../design-system/components/BottomSheet';
import { Button } from '../design-system/components/Button';
import { DecklistTab } from '../features/deck-builder/DecklistTab';
import { SearchTab } from '../features/deck-builder/SearchTab';
import { CoachTab, MODELS, ModelPicker, MODEL_KEY, MESSAGES_PREFIX } from '../features/deck-builder/CoachTab';
import { ImportCardsSheet } from '../features/deck-builder/ImportCardsSheet';
import { ManageSectionsSheet } from '../features/deck-builder/ManageSectionsSheet';

const TABS = [
  { label: 'Decklist', icon: List },
  { label: 'Busca', icon: Search },
];

export default function DeckBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { decks, deleteDeck } = useDeckStore();

  const initialTab = Math.min(Number(searchParams.get('tab') ?? '0'), 1);
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const [direction, setDirection] = React.useState(0);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [manageSectionsOpen, setManageSectionsOpen] = React.useState(false);
  const [coachModelOpen, setCoachModelOpen] = React.useState(false);
  const [coachModel, setCoachModel] = React.useState(() => {
    const stored = localStorage.getItem(MODEL_KEY);
    if (stored && MODELS.some((m) => m.id === stored)) return stored;
    localStorage.setItem(MODEL_KEY, MODELS[0].id);
    return MODELS[0].id;
  });
  const [allExpanded, setAllExpanded] = React.useState(true);
  const [coachOpen, setCoachOpen] = React.useState(false);

  const deck = decks.find((d) => d.id === id);

  function handleTabChange(newTab: number) {
    if (newTab === activeTab) return;
    setDirection(newTab > activeTab ? 1 : -1);
    setActiveTab(newTab);
    setSearchParams({ tab: String(newTab) }, { replace: true });
  }

  const bind = useDrag(
    ({ last, movement: [mx], velocity: [vx] }) => {
      if (!last) return;
      const threshold = 50;
      if (mx < -threshold || vx < -0.5) {
        if (activeTab < TABS.length - 1) handleTabChange(activeTab + 1);
      } else if (mx > threshold || vx > 0.5) {
        if (activeTab > 0) handleTabChange(activeTab - 1);
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      threshold: 10,
    }
  );

  if (!deck) {
    return (
      <div
        style={{
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '36px' }}>🃏</span>
        <h2 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Deck não encontrado</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Este deck pode ter sido excluído.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            backgroundColor: 'var(--accent)',
            color: '#0f0f0f',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '8px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  const totalCards = deck.cards.reduce((s, c) => s + c.quantity, 0);

  const floatingBtnStyle: React.CSSProperties = {
    position: 'fixed',
    top: 'max(12px, env(safe-area-inset-top))',
    zIndex: 50,
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(28, 28, 30, 0.78)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '0.5px solid rgba(255,255,255,0.10)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.88)',
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-base)',
        overflow: 'hidden',
      }}
    >
      {/* Floating back button — closes coach if open, else goes home */}
      <button
        style={{ ...floatingBtnStyle, left: '16px' }}
        onClick={() => coachOpen ? setCoachOpen(false) : navigate('/')}
      >
        <ArrowLeft size={17} />
      </button>

      {/* Floating expand/collapse — only on Decklist, not in coach */}
      {!coachOpen && activeTab === 0 && (
        <button
          style={{ ...floatingBtnStyle, right: '104px' }}
          onClick={() => setAllExpanded((v) => !v)}
        >
          <ChevronsUpDown size={15} />
        </button>
      )}

      {/* Floating Coach button — hidden when coach is already open */}
      {!coachOpen && (
        <button
          style={{ ...floatingBtnStyle, right: '60px' }}
          onClick={() => setCoachOpen(true)}
        >
          <Bot size={16} />
        </button>
      )}

      {/* Floating menu button */}
      <button style={{ ...floatingBtnStyle, right: '16px' }} onClick={() => setMenuOpen(true)}>
        <MoreHorizontal size={17} />
      </button>

      {/* Tab content */}
      <div
        {...(!coachOpen ? bind() : {})}
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          touchAction: coachOpen ? 'auto' : 'pan-y',
        }}
      >
        {/* Decklist / Search tabs */}
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            initial={{ x: direction > 0 ? '100%' : '-100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? '-30%' : '30%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 35, mass: 0.8 }}
            style={{
              position: 'absolute',
              inset: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingTop: 'calc(max(12px, env(safe-area-inset-top)) + 52px)',
              paddingBottom: 'calc(96px + env(safe-area-inset-bottom))',
            }}
          >
            {activeTab === 0 && <DecklistTab deck={deck} forcedExpandAll={allExpanded} />}
            {activeTab === 1 && <SearchTab deck={deck} />}
          </motion.div>
        </AnimatePresence>

        {/* Coach full-screen overlay — slides in from right */}
        <AnimatePresence>
          {coachOpen && (
            <motion.div
              key="coach"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
              style={{
                position: 'absolute',
                inset: 0,
                paddingTop: 'calc(max(12px, env(safe-area-inset-top)) + 52px)',
                paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
                backgroundColor: 'var(--bg-base)',
              }}
            >
              <CoachTab deck={deck} model={coachModel} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating bottom tab bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 'max(16px, calc(env(safe-area-inset-bottom) + 8px))',
          left: '16px',
          right: '16px',
          zIndex: 50,
          borderRadius: '999px',
          backgroundColor: 'rgba(18, 18, 20, 0.92)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
          display: coachOpen ? 'none' : 'flex',
          padding: '4px',
        }}
      >
        {TABS.map((tab, i) => {
          const Icon = tab.icon;
          const active = activeTab === i;
          return (
            <button
              key={tab.label}
              onClick={() => handleTabChange(i)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                padding: '6px 0 5px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
                color: active ? 'var(--accent)' : 'rgba(255,255,255,0.38)',
                transition: 'color 0.2s',
              }}
            >
              <Icon size={18} />
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: active ? 600 : 400,
                  letterSpacing: '0.01em',
                  lineHeight: 1,
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Deck actions bottom sheet */}
      <BottomSheet isOpen={menuOpen} onClose={() => setMenuOpen(false)} title="Opções do deck">
        <div style={{ padding: '8px 0 24px' }}>
          {/* Coach model */}
          <button
            onClick={() => { setMenuOpen(false); setCoachModelOpen(true); }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 20px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              transition: 'background-color 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'var(--text-secondary)',
              }}
            >
              <Cpu size={17} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                Modelo do Coach
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {MODELS.find((m) => m.id === coachModel)?.label ?? 'Gemini 2.0 Flash'}
              </p>
            </div>
          </button>

          {/* Clear coach history */}
          <button
            onClick={() => {
              localStorage.removeItem(`${MESSAGES_PREFIX}${deck.id}`);
              setMenuOpen(false);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 20px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              transition: 'background-color 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'var(--text-secondary)',
              }}
            >
              <Trash2 size={17} />
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                Limpar histórico do Coach
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '1px 0 0' }}>
                Apaga a conversa deste deck
              </p>
            </div>
          </button>

          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 20px' }} />

          {/* Manage sections */}
          <button
            onClick={() => { setMenuOpen(false); setManageSectionsOpen(true); }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 20px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              transition: 'background-color 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'var(--text-secondary)',
              }}
            >
              <LayoutList size={17} />
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                Gerenciar seções
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '1px 0 0' }}>
                Ordenar, criar e remover seções
              </p>
            </div>
          </button>

          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 20px' }} />

          {/* Import cards */}
          <button
            onClick={() => { setMenuOpen(false); setImportOpen(true); }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 20px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              transition: 'background-color 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-subtle)',
                border: '1px solid var(--accent-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'var(--accent)',
              }}
            >
              <FileInput size={17} />
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                Importar cartas
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '1px 0 0' }}>
                Adicionar de uma lista de texto
              </p>
            </div>
          </button>

          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 20px' }} />

          {/* Delete deck */}
          <button
            onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 20px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              transition: 'background-color 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(248, 113, 113, 0.12)',
                border: '1px solid rgba(248, 113, 113, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'var(--error)',
              }}
            >
              <Trash2 size={17} />
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--error)', margin: 0 }}>
                Excluir deck
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '1px 0 0' }}>
                Remove permanentemente este deck
              </p>
            </div>
          </button>
        </div>
      </BottomSheet>

      {/* Coach model sheet */}
      <BottomSheet isOpen={coachModelOpen} onClose={() => setCoachModelOpen(false)} title="Modelo do Coach">
        <div style={{ padding: '8px 20px 32px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px' }}>
            Todos os modelos são gratuitos via OpenRouter.
          </p>
          <ModelPicker
            selected={coachModel}
            onChange={(id) => {
              localStorage.setItem(MODEL_KEY, id);
              setCoachModel(id);
              setCoachModelOpen(false);
            }}
          />
        </div>
      </BottomSheet>

      {/* Manage sections sheet */}
      <ManageSectionsSheet
        isOpen={manageSectionsOpen}
        onClose={() => setManageSectionsOpen(false)}
        deck={deck}
      />

      {/* Import cards sheet */}
      <ImportCardsSheet
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        deckId={deck.id}
      />

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              backgroundColor: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
            onClick={() => setConfirmDelete(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-xl)',
                padding: '24px',
                width: '100%',
                maxWidth: '320px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'rgba(248, 113, 113, 0.12)',
                  border: '1px solid rgba(248, 113, 113, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--error)',
                }}
              >
                <Trash2 size={22} />
              </div>
              <div>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                  Excluir "{deck.name}"?
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  Esta ação não pode ser desfeita. O deck e todas as suas cartas serão removidos permanentemente.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="ghost" size="md" fullWidth onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  fullWidth
                  onClick={() => {
                    deleteDeck(deck.id);
                    navigate('/');
                  }}
                >
                  Excluir
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
