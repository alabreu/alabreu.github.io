import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, MoreHorizontal, Trash2, FileInput, FileOutput, LayoutList, ChevronsUpDown, Sparkles, History, LogOut, ListChecks, FolderInput, X, Pencil } from 'lucide-react';
import { TutorButton } from '../features/deck-builder/TutorButton';
import { useDeckStore, materializeCategories } from '../store/useDeckStore';
import { BottomSheet } from '../design-system/components/BottomSheet';
import { Button } from '../design-system/components/Button';
import { DecklistTab } from '../features/deck-builder/DecklistTab';
import { SearchTab } from '../features/deck-builder/SearchTab';
import { CoachTab, MESSAGES_PREFIX, PersonaPicker, CustomInstructionsField } from '../features/deck-builder/CoachTab';
import { PERSONAS, getPersonaId, setPersonaId } from '../features/deck-builder/tutorPersona';
import { DEFAULT_ACTIVE_MODEL } from '../features/deck-builder/tutorModels';
import { ImportCardsSheet } from '../features/deck-builder/ImportCardsSheet';
import { BulkListSheet } from '../features/deck-builder/BulkListSheet';
import { ManageSectionsSheet } from '../features/deck-builder/ManageSectionsSheet';
import { MoveToSectionSheet } from '../features/deck-builder/MoveToSectionSheet';
import { ExportDeckSheet } from '../features/deck-builder/ExportDeckSheet';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { useSupabaseSession } from '../lib/useSupabaseSession';
import { EdhrecSheet, EdhrecIcon } from '../features/deck-builder/EdhrecSheet';
import { CONTENT_MAX_WIDTH, edgeInset } from '../design-system/responsive';
import { glassSurface, GLASS_SHADOW, GLASS_LABEL } from '../design-system/glass';

type MenuRowTone = 'default' | 'accent' | 'danger';
const MENU_ROW_TONES: Record<MenuRowTone, { bg: string; border: string; icon: string; title: string }> = {
  default: { bg: 'var(--surface-1)', border: 'var(--border-default)', icon: 'var(--text-secondary)', title: 'var(--text-primary)' },
  accent: { bg: 'var(--accent-subtle)', border: 'var(--accent-border)', icon: 'var(--accent)', title: 'var(--text-primary)' },
  danger: { bg: 'rgba(248, 113, 113, 0.12)', border: 'rgba(248, 113, 113, 0.2)', icon: 'var(--error)', title: 'var(--error)' },
};

/** One row in a bottom-sheet action menu: icon chip + title + subtitle. */
function MenuRow({
  icon,
  title,
  subtitle,
  onClick,
  tone = 'default',
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  tone?: MenuRowTone;
}) {
  const t = MENU_ROW_TONES[tone];
  return (
    <button
      onClick={onClick}
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
          backgroundColor: t.bg,
          border: `1px solid ${t.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: t.icon,
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: 500, color: t.title, margin: 0 }}>{title}</p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {subtitle}
        </p>
      </div>
    </button>
  );
}

const MENU_DIVIDER = <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 20px' }} />;

/** A tertiary (borderless) button in the bulk-selection action bar. The bar is
 *  already a container, so nesting bordered pills inside it just ate the space
 *  the labels needed. */
function BulkActionButton({
  icon,
  label,
  onClick,
  danger,
  hideLabel,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  /** Render the icon alone (the label stays as the accessible name). */
  hideLabel?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: '14px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        color: danger ? '#f87171' : 'rgba(255,255,255,0.92)',
        WebkitTapHighlightColor: 'transparent',
      }}
      aria-label={label}
    >
      {icon}
      {!hideLabel && label}
    </button>
  );
}

export default function DeckBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { decks, deleteDeck, healDeck, setCardQuantity, updateCardCategory, addCategory } = useDeckStore();

  const [menuOpen, setMenuOpen] = React.useState(false);
  // Bulk selection of decklist cards (checkbox on each card art).
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
  const [bulkEditOpen, setBulkEditOpen] = React.useState(false);
  const [moveToOpen, setMoveToOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [bulkListOpen, setBulkListOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [manageSectionsOpen, setManageSectionsOpen] = React.useState(false);
  const [edhrecOpen, setEdhrecOpen] = React.useState(false);
  const [personaOpen, setPersonaOpen] = React.useState(false);
  const [personaId, setPersonaIdState] = React.useState(() => getPersonaId());
  const [tutorMenuOpen, setTutorMenuOpen] = React.useState(false);
  const [tutorSessionsOpen, setTutorSessionsOpen] = React.useState(false);
  const [allExpanded, setAllExpanded] = React.useState(true);
  const [coachOpen, setCoachOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [coachSearchQuery, setCoachSearchQuery] = React.useState('');
  const [coachSearchQueryVersion, setCoachSearchQueryVersion] = React.useState(0);
  const [searchOpenedFromCoach, setSearchOpenedFromCoach] = React.useState(false);
  const { session } = useSupabaseSession();

  // Coach's "ver N cartas na busca" link (10+ cards mentioned in one
  // paragraph) hands off to Search pre-filled with a query matching all of them.
  function handleOpenSearchFromCoach(query: string) {
    setCoachSearchQuery(query);
    setCoachSearchQueryVersion((v) => v + 1);
    setCoachOpen(false);
    setSearchOpenedFromCoach(true);
    setSearchOpen(true);
  }

  const deck = decks.find((d) => d.id === id);

  // Self-heal decks whose commander/partner metadata is out of sync with
  // their "Comandante"-tagged cards (e.g. imported before this was wired up).
  React.useEffect(() => {
    if (deck) healDeck(deck.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck?.id]);

  // Reset the bulk selection when switching decks.
  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [deck?.id]);

  const toggleSelect = React.useCallback((scryfallId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(scryfallId)) next.delete(scryfallId);
      else next.add(scryfallId);
      return next;
    });
  }, []);
  const clearSelection = React.useCallback(() => setSelectedIds(new Set()), []);
  const selectMany = React.useCallback((ids: string[]) => setSelectedIds(new Set(ids)), []);

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
    // Gap BELOW the status bar equal to the 16px side inset, so the buttons
    // don't touch the (now opaque, iOS 26.1+) status-bar band and sit with a
    // symmetric margin all around.
    top: 'calc(env(safe-area-inset-top) + 16px)',
    zIndex: 50,
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    ...glassSurface,
    boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.88)',
    WebkitTapHighlightColor: 'transparent',
  };

  // Bulk actions on the current selection. Remove drops every copy of each
  // selected card; move re-categorizes them (creating the section if new).
  // (deckId is captured so the narrowing survives inside these closures.)
  const deckId = deck.id;
  function handleBulkRemove() {
    selectedIds.forEach((scryfallId) => setCardQuantity(deckId, scryfallId, 0));
    clearSelection();
  }
  function handleMoveTo(category: string) {
    addCategory(deckId, category); // idempotent — creates the section if new
    selectedIds.forEach((scryfallId) => updateCardCategory(deckId, scryfallId, category));
    setMoveToOpen(false);
    clearSelection();
  }
  const moveTargets = materializeCategories(deck).filter((c) => c !== 'Comandante');
  const selectionActive = selectedIds.size > 0;

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
        style={{ ...floatingBtnStyle, left: edgeInset(16) }}
        onClick={() => {
          if (searchOpen) {
            setSearchOpen(false);
            if (searchOpenedFromCoach) { setSearchOpenedFromCoach(false); setCoachOpen(true); }
            return;
          }
          if (coachOpen) { setCoachOpen(false); return; }
          navigate('/');
        }}
      >
        <ArrowLeft size={17} />
      </button>

      {/* Floating EDHREC suggestions — only on search view */}
      {searchOpen && (
        <button
          style={{ ...floatingBtnStyle, right: edgeInset(60) }}
          onClick={() => setEdhrecOpen(true)}
          aria-label="Sugestões do EDHREC"
        >
          <EdhrecIcon size={17} />
        </button>
      )}

      {/* Floating menu button — contextual: Tutor options while chatting, deck options otherwise */}
      <button
        style={{ ...floatingBtnStyle, right: edgeInset(16) }}
        onClick={() => (coachOpen ? setTutorMenuOpen(true) : setMenuOpen(true))}
      >
        <MoreHorizontal size={17} />
      </button>

      {/* Main content — Decklist is always the base view */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', width: '100%', maxWidth: CONTENT_MAX_WIDTH, margin: '0 auto' }}>
        {/* Decklist (permanent base) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflowY: 'auto',
            paddingTop: 'calc(env(safe-area-inset-top) + 64px)',
            paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
          }}
        >
          <DecklistTab
            deck={deck}
            forcedExpandAll={allExpanded}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectMany={selectMany}
            onManageSections={() => setManageSectionsOpen(true)}
          />
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
                paddingTop: 'calc(env(safe-area-inset-top) + 64px)',
                paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
                backgroundColor: 'var(--bg-base)',
              }}
            >
              <SearchTab deck={deck} initialQuery={coachSearchQuery} initialQueryVersion={coachSearchQueryVersion} />
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
                // No paddingTop here: CoachTab's own scroller carries the top
                // inset, so messages scroll up under the floating buttons /
                // status bar (like the Decklist) instead of clipping below them.
                paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
                backgroundColor: 'var(--bg-base)',
              }}
            >
              <CoachTab key={deck.id} deck={deck} model={DEFAULT_ACTIVE_MODEL} personaId={personaId} onOpenSearch={handleOpenSearchFromCoach} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk-selection action bar — replaces the search bar while cards are
          selected via their checkboxes. */}
      {!coachOpen && !searchOpen && selectionActive && (
        <div
          style={{
            position: 'fixed',
            bottom: 'max(16px, calc(env(safe-area-inset-bottom) + 8px))',
            left: edgeInset(16),
            right: edgeInset(16),
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            // The bar is the only container: its buttons are borderless, so the
            // padding here stays tight and the buttons carry their own.
            padding: '2px 6px',
            borderRadius: '999px',
            ...glassSurface,
            boxShadow: GLASS_SHADOW,
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              padding: '0 4px 0 14px',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <strong style={{ color: 'var(--accent)', fontWeight: 700 }}>{selectedIds.size}</strong>
            {selectedIds.size === 1 ? ' carta' : ' cartas'}
            <span className="bulk-action-collapsible-label">
              {selectedIds.size === 1 ? ' selecionada' : ' selecionadas'}
            </span>
          </span>
          <span style={{ flex: 1 }} />
          <BulkActionButton icon={<Pencil size={16} />} label="Editar" onClick={() => setBulkEditOpen(true)} />
          <BulkActionButton icon={<X size={16} />} label="Cancelar" hideLabel onClick={clearSelection} />
        </div>
      )}

      {/* Bottom bar: search pill + coach button */}
      {!coachOpen && !searchOpen && !selectionActive && (
        <div
          style={{
            position: 'fixed',
            bottom: 'max(16px, calc(env(safe-area-inset-bottom) + 8px))',
            left: edgeInset(16),
            right: edgeInset(16),
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {/* Coach button */}
          <TutorButton onClick={() => setCoachOpen(true)} />

          {/* Search pill */}
          <button
            onClick={() => {
              // Opening a fresh search from the pill must not replay the last
              // Coach handoff query — clear it and bump the version so SearchTab
              // starts blank.
              setCoachSearchQuery('');
              setCoachSearchQueryVersion((v) => v + 1);
              setSearchOpenedFromCoach(false);
              setSearchOpen(true);
            }}
            style={{
              flex: 1,
              borderRadius: '999px',
              ...glassSurface,
              boxShadow: GLASS_SHADOW,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 20px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Search size={16} color={GLASS_LABEL} />
            <span style={{ fontSize: '15px', color: GLASS_LABEL, flex: 1, textAlign: 'left' }}>
              Buscar cartas...
            </span>
          </button>

          {/* Expand/collapse all */}
          <button
            onClick={() => setAllExpanded((v) => !v)}
            style={{
              width: '52px',
              height: '52px',
              flexShrink: 0,
              borderRadius: '50%',
              ...glassSurface,
              boxShadow: GLASS_SHADOW,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <ChevronsUpDown size={18} />
          </button>
        </div>
      )}

      {/* Deck actions bottom sheet */}
      <BottomSheet isOpen={menuOpen} onClose={() => setMenuOpen(false)} title="Opções do deck">
        <div style={{ padding: '8px 0 24px' }}>
          <MenuRow
            icon={<LayoutList size={17} />}
            title="Gerenciar seções"
            subtitle="Ordenar, criar e remover seções"
            onClick={() => { setMenuOpen(false); setManageSectionsOpen(true); }}
          />
          {MENU_DIVIDER}
          <MenuRow
            icon={<FileInput size={17} />}
            tone="accent"
            title="Importar cartas"
            subtitle="Adicionar de uma lista de texto"
            onClick={() => { setMenuOpen(false); setImportOpen(true); }}
          />
          {MENU_DIVIDER}
          <MenuRow
            icon={<ListChecks size={17} />}
            title="Editar por lista"
            subtitle="Adicionar ou remover cartas em lote"
            onClick={() => { setMenuOpen(false); setBulkListOpen(true); }}
          />
          {MENU_DIVIDER}
          <MenuRow
            icon={<FileOutput size={17} />}
            title="Exportar cartas"
            subtitle="Copiar lista em texto"
            onClick={() => { setMenuOpen(false); setExportOpen(true); }}
          />
          {MENU_DIVIDER}
          <MenuRow
            icon={<Trash2 size={17} />}
            tone="danger"
            title="Excluir deck"
            subtitle="Remove permanentemente este deck"
            onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
          />
        </div>
      </BottomSheet>

      {/* Tutor options bottom sheet */}
      <BottomSheet isOpen={tutorMenuOpen} onClose={() => setTutorMenuOpen(false)} title="Opções do Tutor">
        <div style={{ padding: '8px 0 24px' }}>
          <MenuRow
            icon={<Sparkles size={17} />}
            title="Personalidade do Tutor"
            subtitle={PERSONAS.find((p) => p.id === personaId)?.name ?? 'Tutor'}
            onClick={() => { setTutorMenuOpen(false); setPersonaOpen(true); }}
          />
          {MENU_DIVIDER}
          <MenuRow
            icon={<History size={17} />}
            title="Gerenciar sessões"
            subtitle="Limpar histórico ou sair da conta"
            onClick={() => { setTutorMenuOpen(false); setTutorSessionsOpen(true); }}
          />
        </div>
      </BottomSheet>

      {/* Tutor sessions sheet: clear history, sign out */}
      <BottomSheet isOpen={tutorSessionsOpen} onClose={() => setTutorSessionsOpen(false)} title="Gerenciar sessões">
        <div style={{ padding: '8px 20px 32px' }}>
          <button
            onClick={() => {
              localStorage.removeItem(`${MESSAGES_PREFIX}${deck.id}`);
              setTutorSessionsOpen(false);
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
            Limpar histórico do Tutor
          </button>

          {supabaseConfigured && session && (
            <button
              onClick={() => {
                supabase?.auth.signOut();
                setTutorSessionsOpen(false);
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

      {/* Persona sheet */}
      <BottomSheet isOpen={personaOpen} onClose={() => setPersonaOpen(false)} title="Personalidade do Tutor">
        <div style={{ padding: '8px 20px 32px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px' }}>
            Escolha o tom de voz do Tutor.
          </p>
          <PersonaPicker
            selected={personaId}
            onChange={(id) => {
              setPersonaId(id);
              setPersonaIdState(id);
            }}
          />
          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '20px 0 12px' }} />
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 8px' }}>
            Preferências adicionais (opcional) — ajustes de estilo sobre o preset escolhido.
          </p>
          <CustomInstructionsField />
        </div>
      </BottomSheet>

      {/* Manage sections sheet */}
      <ManageSectionsSheet
        isOpen={manageSectionsOpen}
        onClose={() => setManageSectionsOpen(false)}
        deck={deck}
      />

      {/* Bulk edit: the single entry point for actions on the selection, so the
          destructive one sits behind a deliberate tap instead of on the bar. */}
      <BottomSheet
        isOpen={bulkEditOpen}
        onClose={() => setBulkEditOpen(false)}
        title={`${selectedIds.size} ${selectedIds.size === 1 ? 'carta selecionada' : 'cartas selecionadas'}`}
      >
        <div style={{ padding: '8px 0 24px' }}>
          <MenuRow
            icon={<FolderInput size={17} />}
            title="Mover para seção"
            subtitle="Escolher ou criar uma seção"
            onClick={() => { setBulkEditOpen(false); setMoveToOpen(true); }}
          />
          {MENU_DIVIDER}
          <MenuRow
            icon={<Trash2 size={17} />}
            tone="danger"
            title="Remover do deck"
            subtitle={selectedIds.size === 1 ? 'Remove a carta selecionada' : `Remove as ${selectedIds.size} cartas selecionadas`}
            onClick={() => { setBulkEditOpen(false); handleBulkRemove(); }}
          />
        </div>
      </BottomSheet>

      {/* Move selected cards to a section */}
      <MoveToSectionSheet
        isOpen={moveToOpen}
        onClose={() => setMoveToOpen(false)}
        sections={moveTargets}
        count={selectedIds.size}
        onPick={handleMoveTo}
      />

      {/* Import cards sheet */}
      <BulkListSheet isOpen={bulkListOpen} onClose={() => setBulkListOpen(false)} deck={deck} />

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
