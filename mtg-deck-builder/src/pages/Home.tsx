import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDeckStore } from '../store/useDeckStore';
import { Deck } from '../types';
import { Button } from '../design-system/components/Button';
import { Input } from '../design-system/components/Input';
import { BottomSheet } from '../design-system/components/BottomSheet';
import { ManaGroup } from '../design-system/components/ManaSymbol';
import { Badge } from '../design-system/components/Badge';

function DeckCard({ deck, onDelete }: { deck: Deck; onDelete: (id: string) => void }) {
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = React.useState(false);
  const totalCards = deck.cards.reduce((s, c) => s + c.quantity, 0);

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{
        position: 'relative',
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
      {deck.commanderArtUrl ? (
        <>
          <img
            src={deck.commanderArtUrl}
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
              color: deck.commanderArtUrl ? '#fff' : 'var(--text-primary)',
              letterSpacing: '-0.02em',
              textShadow: deck.commanderArtUrl ? '0 1px 4px rgba(0,0,0,0.8)' : 'none',
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
            style={{ color: deck.commanderArtUrl ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', flexShrink: 0 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <ManaGroup
            colors={deck.colorIdentity.length > 0 ? deck.colorIdentity : ['C']}
            size="sm"
          />
          <span
            style={{
              fontSize: '11px',
              color: deck.commanderArtUrl ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)',
            }}
          >
            {totalCards} cartas
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
              Excluir "{deck.name}"?
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDelete(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onDelete(deck.id);
                  setShowDelete(false);
                }}
              >
                Excluir
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Home() {
  const { decks, createDeck, deleteDeck } = useDeckStore();
  const navigate = useNavigate();
  const [newDeckSheetOpen, setNewDeckSheetOpen] = React.useState(false);
  const [newDeckName, setNewDeckName] = React.useState('');
  const [nameError, setNameError] = React.useState('');

  function handleCreateDeck() {
    const trimmed = newDeckName.trim();
    if (!trimmed) {
      setNameError('Por favor, insira um nome para o deck');
      return;
    }
    const deck = createDeck(trimmed);
    setNewDeckSheetOpen(false);
    setNewDeckName('');
    setNameError('');
    navigate(`/deck/${deck.id}`);
  }

  function handleSheetClose() {
    setNewDeckSheetOpen(false);
    setNewDeckName('');
    setNameError('');
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-base)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '20px 20px 0',
          paddingTop: 'max(20px, env(safe-area-inset-top))',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '22px' }}>🃏</span>
              <h1
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.04em',
                  margin: 0,
                }}
              >
                MTG Deck Builder
              </h1>
            </div>
            <button
              onClick={() => navigate('/design')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'inherit',
              }}
            >
              Design
            </button>
          </div>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-muted)',
              margin: '0 0 20px 0',
              letterSpacing: '-0.01em',
            }}
          >
            Commander Deck Builder — {decks.length} {decks.length === 1 ? 'deck' : 'decks'}
          </p>
        </motion.div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, padding: '0 16px 32px' }}>
        {decks.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              padding: '60px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: 'var(--radius-xl)',
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
              }}
            >
              🃏
            </div>
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
                Nenhum deck ainda
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
                Crie seu primeiro deck Commander e comece a construir sua coleção.
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Plus size={18} />}
              onClick={() => setNewDeckSheetOpen(true)}
            >
              Criar Primeiro Deck
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
                marginBottom: '16px',
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
            </motion.div>

            {/* New deck button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <button
                onClick={() => setNewDeckSheetOpen(true)}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: 'transparent',
                  border: '1px dashed var(--border-default)',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  fontWeight: 500,
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
                <Plus size={16} />
                Novo Deck
              </button>
            </motion.div>
          </>
        )}
      </main>

      {/* New Deck Bottom Sheet */}
      <BottomSheet
        isOpen={newDeckSheetOpen}
        onClose={handleSheetClose}
        title="Novo Deck"
      >
        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--accent-subtle)',
              border: '1px solid var(--accent-border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
            }}
          >
            <Sparkles size={15} style={{ color: 'var(--accent)', marginTop: '1px', flexShrink: 0 }} />
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Dê um nome ao seu deck. Depois, busque cartas e defina seu Comandante.
            </p>
          </div>

          <Input
            label="Nome do Deck"
            placeholder="Ex: Atraxa Proliferação"
            value={newDeckName}
            onChange={(e) => {
              setNewDeckName(e.target.value);
              if (nameError) setNameError('');
            }}
            error={nameError}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateDeck();
            }}
            autoFocus
          />

          <Button
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={<Plus size={18} />}
            onClick={handleCreateDeck}
            disabled={!newDeckName.trim()}
          >
            Criar Deck
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
