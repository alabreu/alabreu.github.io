import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Bot, MoreHorizontal, Trash2, FileInput, FileOutput, LayoutList, ChevronsUpDown, Cpu, LogOut } from 'lucide-react';
import { useDeckStore } from '../store/useDeckStore';
import { BottomSheet } from '../design-system/components/BottomSheet';
import { Button } from '../design-system/components/Button';
import { DecklistTab } from '../features/deck-builder/DecklistTab';
import { SearchTab } from '../features/deck-builder/SearchTab';
import { CoachTab, MODELS, ModelPicker, MODEL_KEY, MESSAGES_PREFIX } from '../features/deck-builder/CoachTab';
import { ImportCardsSheet } from '../features/deck-builder/ImportCardsSheet';
import { ManageSectionsSheet } from '../features/deck-builder/ManageSectionsSheet';
import { ExportDeckSheet } from '../features/deck-builder/ExportDeckSheet';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { useSupabaseSession } from '../lib/useSupabaseSession';
import { EdhrecSheet, EdhrecIcon } from '../features/deck-builder/EdhrecSheet';

export default function DeckBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { decks, deleteDeck, healDeck } = useDeckStore();

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [manageSectionsOpen, setManageSectionsOpen] = React.useState(false);
  const [edhrecOpen, setEdhrecOpen] = React.useState(false);
  const [coachModelOpen, setCoachModelOpen] = React.useState(false);
  const [coachModel, setCoachModel] = React.useState(() => {
    const stored = localStorage.getItem(MODEL_KEY);
    if (stored && MODELS.some((m) => m.id === stored)) return stored;
    localStorage.setItem(MODEL_KEY, MODELS[0].id);
    return MODELS[0].id;
  });
  const [allExpanded, setAllExpanded] = React.useState(true);
  const [coachOpen, setCoachOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const { session } = useSupabaseSession();

  const deck = decks.find((d) => d.id === id);

  // Self-heal decks whose commander/partner metadata is out of sync with
  // their "Comandante"-tagged cards (e.g. imported before this was wired up).
  React.useEffect(() => {
    if (deck) healDeck(deck.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck?.id]);

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
      {/* Floating back button — closes overlays first, then goes home */}
      <button
        style={{ ...floatingBtnStyle, left: '16px' }}
        onClick={() => {
          if (searchOpen) { setSearchOpen(false); return; }
          if (coachOpen) { setCoachOpen(false); return; }
          navigate('/');
        }}
      >
        <ArrowLeft size={17} />
      </button>

      {/* Floating expand/collapse — only on main view */}
      {!coachOpen && !searchOpen && (
        <button
          style={{ ...floatingBtnStyle, right: '60px' }}
          onClick={() => setAllExpanded((v) => !v)}
        >
          <ChevronsUpDown size={15} />
        </button>
      )}

      {/* Floating EDHREC suggestions — only on search view */}
      {searchOpen && (
        <button
          style={{ ...floatingBtnStyle, right: '60px' }}
          onClick={() => setEdhrecOpen(true)}
          aria-label="Sugestões do EDHREC"
        >
          <EdhrecIcon size={17} />
        </button>
      )}

      {/* Floating menu button */}
      <button style={{ ...floatingBtnStyle, right: '16px' }} onClick={() => setMenuOpen(true)}>
        <MoreHorizontal size={17} />
      </button>

      {/* Main content — Decklist is always the base view */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Decklist (permanent base) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflowY: 'auto',
            paddingTop: 'calc(max(12px, env(safe-area-inset-top)) + 52px)',
            paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
          }}
        >
          <DecklistTab deck={deck} forcedExpandAll={allExpanded} />
        </div>

        {/* Search overlay */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              key="search"
              initial={{ y: '30%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '30%', opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              style={{
                position: 'absolute',
                inset: 0,
                paddingTop: 'calc(max(12px, env(safe-area-inset-top)) + 52px)',
                paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
                backgroundColor: 'var(--bg-base)',
              }}
            >
              <SearchTab deck={deck} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coach overlay */}
        <AnimatePresence>
          {coachOpen && (
            <motion.div
              key="coach"
              initial={{ y: '30%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '30%', opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
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

      {/* Bottom bar: search pill + coach button */}
      {!coachOpen && !searchOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 'max(16px, calc(env(safe-area-inset-bottom) + 8px))',
            left: '16px',
            right: '16px',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {/* Search pill */}
          <button
            onClick={() => setSearchOpen(true)}
            style={{
              flex: 1,
              borderRadius: '999px',
              backgroundColor: 'rgba(18, 18, 20, 0.92)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 20px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Search size={16} color="rgba(255,255,255,0.35)" />
            <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.35)', flex: 1, textAlign: 'left' }}>
              Buscar cartas...
            </span>
          </button>

          {/* Coach button */}
          <button
            onClick={() => setCoachOpen(true)}
            style={{
              width: '52px',
              height: '52px',
              flexShrink: 0,
              borderRadius: '50%',
              backgroundColor: 'rgba(18, 18, 20, 0.92)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <Bot size={18} />
          </button>
        </div>
      )}

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

          {/* Export cards */}
          <button
            onClick={() => { setMenuOpen(false); setExportOpen(true); }}
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
              <FileOutput size={17} />
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                Exportar cartas
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '1px 0 0' }}>
                Copiar lista em texto
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
          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '16px 0 12px' }} />
          <button
            onClick={() => {
              localStorage.removeItem(`${MESSAGES_PREFIX}${deck.id}`);
              setCoachModelOpen(false);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Trash2 size={14} />
            Limpar histórico do Coach
          </button>

          {supabaseConfigured && session && (
            <button
              onClick={() => {
                supabase?.auth.signOut();
                setCoachModelOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                marginTop: '8px',
                backgroundColor: 'transparent',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <LogOut size={14} />
              Sair da conta ({session.user.email})
            </button>
          )}
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

      {/* Export cards sheet */}
      <ExportDeckSheet
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        deck={deck}
      />

      {/* EDHREC suggestions sheet */}
      <EdhrecSheet
        isOpen={edhrecOpen}
        onClose={() => setEdhrecOpen(false)}
        deck={deck}
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
