import React from 'react';
import { RetryImg } from '../features/card/RetryImg';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronRight, User, FileInput, LogIn, LogOut, MessageSquare, Globe, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDeckStore } from '../store/useDeckStore';
import { Deck } from '../types';
import { Button } from '../design-system/components/Button';
import { BottomSheet } from '../design-system/components/BottomSheet';
import { ManaGroup } from '../design-system/components/ManaSymbol';
import { ImportDeckSheet } from '../features/deck-builder/ImportDeckSheet';
import { AuthGate } from '../features/deck-builder/AuthGate';
import { FeedbackSheet } from '../features/feedback/FeedbackSheet';
import { CONTENT_MAX_WIDTH } from '../design-system/responsive';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { useSupabaseSession } from '../lib/useSupabaseSession';
import { useLanguage, useT } from '../lib/i18n';
import { Language } from '../lib/translations';
import { PriceSource, getPriceSource, setPriceSource } from '../lib/priceSource';

/** Small circular "avatar" for a picker option — a flag emoji for language,
 *  a currency symbol for price store. */
function OptionAvatar({ content, fontSize = '17px' }: { content: string; fontSize?: string }) {
  return (
    <div
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 700,
        color: 'var(--text-secondary)',
        flexShrink: 0,
      }}
    >
      {content}
    </div>
  );
}

function OptionList<T extends string>({
  options,
  selected,
  onChange,
}: {
  options: { id: T; avatar: string; avatarFontSize?: string; label: string; description?: string }[];
  selected: T;
  onChange: (id: T) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {options.map((o) => {
        const active = selected === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '11px 14px',
              backgroundColor: active ? 'var(--accent-subtle)' : 'var(--surface-1)',
              border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
              transition: 'background-color 0.1s, border-color 0.1s',
            }}
          >
            <OptionAvatar content={o.avatar} fontSize={o.avatarFontSize} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: active ? 'var(--accent)' : 'var(--text-primary)' }}>
                {o.label}
              </p>
              {o.description && (
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>{o.description}</p>
              )}
            </div>
            {active && <Check size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
          </button>
        );
      })}
    </div>
  );
}

function LanguagePicker({
  selected,
  onChange,
}: {
  selected: Language;
  onChange: (lang: Language) => void;
}) {
  const t = useT();
  return (
    <OptionList
      selected={selected}
      onChange={onChange}
      options={[
        { id: 'pt', avatar: '🇧🇷', label: t('home.languagePortuguese') },
        { id: 'en', avatar: '🇺🇸', label: t('home.languageEnglish') },
      ]}
    />
  );
}

function StorePicker({
  selected,
  onChange,
}: {
  selected: PriceSource;
  onChange: (source: PriceSource) => void;
}) {
  const t = useT();
  return (
    <OptionList
      selected={selected}
      onChange={onChange}
      options={[
        {
          id: 'ligamagic',
          avatar: 'R$',
          avatarFontSize: '12px',
          label: t('home.storeLigaMagic'),
          description: t('home.storeLigaMagicDesc'),
        },
        {
          id: 'tcgplayer',
          avatar: '$',
          label: t('home.storeTCGplayer'),
          description: t('home.storeTCGplayerDesc'),
        },
      ]}
    />
  );
}

function DeckCard({ deck, onDelete }: { deck: Deck; onDelete: (id: string) => void }) {
  const navigate = useNavigate();
  const t = useT();
  const [showDelete, setShowDelete] = React.useState(false);
  const totalCards = deck.cards.reduce((s, c) => s + c.quantity, 0);
  // Only show art if the commander card still exists in the deck
  const commanderArtUrl =
    deck.commanderId &&
    deck.commanderArtUrl &&
    deck.cards.some((c) => c.scryfallId === deck.commanderId)
      ? deck.commanderArtUrl
      : null;
  const partnerArtUrl =
    deck.partnerId &&
    deck.partnerArtUrl &&
    deck.cards.some((c) => c.scryfallId === deck.partnerId)
      ? deck.partnerArtUrl
      : null;

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{
        position: 'relative',
        zIndex: 4,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: 'pointer',
        border: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-elevated)',
        minHeight: '160px',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={() => navigate(`/deck/${deck.id}`)}
    >
      {/* Background art */}
      {commanderArtUrl && partnerArtUrl ? (
        <>
          <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
            <RetryImg
              src={commanderArtUrl}
              alt={deck.commanderName ?? ''}
              style={{ width: '50%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
              fallback={<div style={{ width: '50%', height: '100%', backgroundColor: 'var(--surface-2)' }} />}
            />
            <RetryImg
              src={partnerArtUrl}
              alt={deck.partnerName ?? ''}
              style={{ width: '50%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
              fallback={<div style={{ width: '50%', height: '100%', backgroundColor: 'var(--surface-2)' }} />}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '50%',
              width: '2px',
              transform: 'translateX(-1px)',
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.9) 100%)',
            }}
          />
        </>
      ) : commanderArtUrl ? (
        <>
          <RetryImg
            src={commanderArtUrl}
            alt={deck.commanderName ?? ''}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.9) 100%)',
            }}
          />
        </>
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, var(--surface-2) 0%, var(--surface-3) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
            opacity: 0.3,
          }}
        >
          🃏
        </div>
      )}

      {/* Top actions */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '8px',
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDelete(true);
          }}
          style={{
            width: '26px',
            height: '26px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)',
            opacity: 0,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
          className="deck-delete-btn"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Bottom info */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          marginTop: 'auto',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: commanderArtUrl ? '#fff' : 'var(--text-primary)',
              letterSpacing: '-0.02em',
              textShadow: commanderArtUrl ? '0 1px 4px rgba(0,0,0,0.8)' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              marginRight: '8px',
            }}
          >
            {deck.name}
          </h3>
          <ChevronRight
            size={14}
            style={{ color: commanderArtUrl ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', flexShrink: 0 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <ManaGroup
            colors={(deck.colorIdentity ?? []).length > 0 ? deck.colorIdentity : ['C']}
            size="sm"
          />
          <span
            style={{
              fontSize: '11px',
              color: commanderArtUrl ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)',
            }}
          >
            {t(totalCards === 1 ? 'home.cardCountSingular' : 'home.cardCountPlural', { count: totalCards })}
          </span>
        </div>
      </div>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {showDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              backgroundColor: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
              {t('home.deleteConfirm', { name: deck.name })}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDelete(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onDelete(deck.id);
                  setShowDelete(false);
                }}
              >
                {t('common.delete')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Home() {
  const { decks, deleteDeck } = useDeckStore();
  const navigate = useNavigate();
  const { session } = useSupabaseSession();
  const { lang, setLang } = useLanguage();
  const t = useT();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const [languageStoreOpen, setLanguageStoreOpen] = React.useState(false);
  const [priceSource, setPriceSourceState] = React.useState<PriceSource>(() => getPriceSource());
  const versionTapCountRef = React.useRef(0);
  const lastVersionTapRef = React.useRef(0);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Ambient mesh-gradient background — solid blurred blobs, see index.css */}
      <div className="home-mesh-bg">
        <div className="home-mesh-blobs">
          <div className="home-mesh-blob home-mesh-blob-1" />
          <div className="home-mesh-blob home-mesh-blob-2" />
          <div className="home-mesh-blob home-mesh-blob-3" />
          <div className="home-mesh-blob home-mesh-blob-4" />
        </div>
        <div className="home-mesh-fade" />
      </div>

      {/* Header */}
      <header
        style={{
          padding: '0 20px 0',
          paddingTop: 'max(56px, calc(env(safe-area-inset-top) + 20px))',
          width: '100%',
          maxWidth: CONTENT_MAX_WIDTH,
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <h1
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontVariationSettings: "'opsz' 144, 'wght' 800",
                  fontWeight: 800,
                  fontSize: '34px',
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em',
                  margin: '0 0 5px 0',
                  lineHeight: 1.05,
                }}
              >
                {t('home.title')}
              </h1>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                {t(decks.length === 1 ? 'home.deckCountSingular' : 'home.deckCountPlural', { count: decks.length })}
              </p>
            </div>

            {/* Avatar button */}
            <button
              onClick={() => setMenuOpen(true)}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                flexShrink: 0,
                transition: 'background-color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-3)';
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-2)';
                e.currentTarget.style.borderColor = 'var(--border-default)';
              }}
            >
              <User size={18} />
            </button>
          </div>
        </motion.div>
      </header>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          padding: '0 16px 32px',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: CONTENT_MAX_WIDTH,
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {decks.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              padding: '24px',
              textAlign: 'center',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                  letterSpacing: '-0.02em',
                }}
              >
                {t('home.emptyTitle')}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
                {t('home.emptyDescription')}
              </p>
            </div>
            <Button
              variant="white"
              size="lg"
              leftIcon={<Plus size={18} />}
              onClick={() => navigate('/new-deck')}
            >
              {t('home.createFirstDeck')}
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Decks grid */}
            <motion.div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}
            >
              <AnimatePresence>
                {decks.map((deck, i) => (
                  <motion.div
                    key={deck.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <DeckCard deck={deck} onDelete={deleteDeck} />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* New deck silhouette card */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: decks.length * 0.05 + 0.05 }}
                whileTap={{ scale: 0.97, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                onClick={() => navigate('/new-deck')}
                style={{
                  minHeight: '160px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--border-default)',
                  backgroundColor: 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontFamily: 'inherit',
                  padding: 0,
                  transition: 'border-color 0.15s, color 0.15s, background-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-strong)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Plus size={22} strokeWidth={1.5} />
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {t('home.newDeck')}
                </span>
              </motion.button>
            </motion.div>
          </>
        )}
      </main>

      {/* Import deck sheet */}
      <ImportDeckSheet isOpen={importOpen} onClose={() => setImportOpen(false)} />

      {/* Feedback sheet */}
      <FeedbackSheet isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      {/* Login sheet */}
      <BottomSheet isOpen={loginOpen} onClose={() => setLoginOpen(false)} title={t('home.loginSheetTitle')}>
        <AuthGate />
      </BottomSheet>

      {/* Menu Bottom Sheet */}
      <BottomSheet isOpen={menuOpen} onClose={() => setMenuOpen(false)} title={t('home.menuTitle')}>
        <div style={{ padding: '8px 0 24px' }}>
          {/* Account: login / logout */}
          {/* Import deck */}
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
                {t('home.importDeck')}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '1px 0 0' }}>
                {t('home.importDeckDesc')}
              </p>
            </div>
          </button>

          {supabaseConfigured && (
            <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 20px' }} />
          )}

          {/* Feedback: bug report / feature suggestion */}
          {supabaseConfigured && (
            <button
              onClick={() => { setMenuOpen(false); setFeedbackOpen(true); }}
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
                <MessageSquare size={17} />
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                  {t('home.sendFeedback')}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '1px 0 0' }}>
                  {t('home.sendFeedbackDesc')}
                </p>
              </div>
            </button>
          )}

          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 20px' }} />

          {/* Language & Store */}
          <button
            onClick={() => { setMenuOpen(false); setLanguageStoreOpen(true); }}
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
              <Globe size={17} />
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                {t('home.languageAndStore')}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '1px 0 0' }}>
                {lang === 'pt' ? t('home.languagePortuguese') : t('home.languageEnglish')} ·{' '}
                {priceSource === 'ligamagic' ? t('home.storeLigaMagic') : t('home.storeTCGplayer')}
              </p>
            </div>
          </button>

          {supabaseConfigured && (
            <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 20px' }} />
          )}

          {supabaseConfigured && (
            <button
              onClick={() => {
                if (session) {
                  supabase?.auth.signOut();
                  setMenuOpen(false);
                } else {
                  setMenuOpen(false);
                  setLoginOpen(true);
                }
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
                {session ? <LogOut size={17} /> : <LogIn size={17} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                  {session ? t('home.logout') : t('common.login')}
                </p>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    margin: '1px 0 0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {session ? session.user.email : t('home.syncDevices')}
                </p>
              </div>
            </button>
          )}

          {/* Build version — tap 5x quickly to reach the (hidden) Design System page */}
          <p
            onClick={() => {
              const now = Date.now();
              if (now - lastVersionTapRef.current > 800) versionTapCountRef.current = 0;
              lastVersionTapRef.current = now;
              versionTapCountRef.current += 1;
              if (versionTapCountRef.current >= 5) {
                versionTapCountRef.current = 0;
                setMenuOpen(false);
                navigate('/design');
              }
            }}
            style={{
              margin: '12px 20px 0',
              fontSize: '11px',
              color: 'var(--text-muted)',
              textAlign: 'center',
              letterSpacing: '0.02em',
              cursor: 'default',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
            }}
          >
            {t('home.version')} {__BUILD_SHA__} ·{' '}
            {new Date(__BUILD_TIME__).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </BottomSheet>

      {/* Language & Store sheet */}
      <BottomSheet isOpen={languageStoreOpen} onClose={() => setLanguageStoreOpen(false)} title={t('home.languageAndStore')}>
        <div style={{ padding: '8px 20px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {t('home.language')}
            </p>
            <LanguagePicker selected={lang} onChange={setLang} />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {t('home.store')}
            </p>
            <StorePicker
              selected={priceSource}
              onChange={(next) => {
                setPriceSource(next);
                setPriceSourceState(next);
              }}
            />
          </div>
        </div>
      </BottomSheet>

    </div>
  );
}
