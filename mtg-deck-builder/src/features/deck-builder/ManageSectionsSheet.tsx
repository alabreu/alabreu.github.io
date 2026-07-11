import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, Trash2, Plus, Mountain } from 'lucide-react';
import { useDrag } from '@use-gesture/react';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { Deck } from '../../types';
import { useDeckStore, materializeCategories } from '../../store/useDeckStore';

const ITEM_H = 52;

function clamp(min: number, max: number, val: number) {
  return Math.max(min, Math.min(max, val));
}

function initCategories(deck: Deck): string[] {
  // Union of the saved order and every category cards actually use —
  // heals partial lists persisted by older app versions
  return materializeCategories(deck);
}

interface RowProps {
  name: string;
  index: number;
  total: number;
  cardCount: number;
  activeIndex: number | null;
  activeY: number;
  onDragStart: (i: number) => void;
  onDrag: (y: number) => void;
  onDragEnd: () => void;
  onDelete: (name: string) => void;
}

function DraggableRow({
  name, index, total, cardCount,
  activeIndex, activeY,
  onDragStart, onDrag, onDragEnd, onDelete,
}: RowProps) {
  const isActive = activeIndex === index;

  let visualY = 0;
  if (activeIndex !== null) {
    const target = clamp(0, total - 1, activeIndex + Math.round(activeY / ITEM_H));
    if (isActive) {
      visualY = activeY;
    } else if (activeIndex < target && index > activeIndex && index <= target) {
      visualY = -ITEM_H;
    } else if (activeIndex > target && index >= target && index < activeIndex) {
      visualY = ITEM_H;
    }
  }

  const bind = useDrag(
    ({ movement: [, my], first, last, event }) => {
      event.stopPropagation();
      if (first) onDragStart(index);
      if (!last) onDrag(my);
      else onDragEnd();
    },
    { axis: 'y', filterTaps: true }
  );

  return (
    <motion.div
      layout={activeIndex === null}
      animate={{
        y: visualY,
        scale: isActive ? 1.03 : 1,
        zIndex: isActive ? 10 : 0,
        boxShadow: isActive ? '0 8px 24px rgba(0,0,0,0.4)' : '0 0 0 rgba(0,0,0,0)',
        backgroundColor: isActive ? 'var(--surface-2)' : 'transparent',
      }}
      transition={isActive ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
      style={{
        position: 'relative',
        height: ITEM_H,
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '0 4px',
      }}
    >
      {/* Grip handle */}
      <div
        {...bind()}
        style={{
          touchAction: 'none',
          cursor: isActive ? 'grabbing' : 'grab',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          padding: '10px 4px',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          flexShrink: 0,
        }}
      >
        <GripVertical size={17} />
      </div>

      <span style={{ flex: 1, fontSize: '15px', color: 'var(--text-primary)', fontWeight: 500 }}>
        {name}
      </span>

      {cardCount > 0 && (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
          {cardCount}
        </span>
      )}

      {/* The commander section is structural and cannot be deleted */}
      {name !== 'Comandante' && (
      <button
        onClick={() => onDelete(name)}
        style={{
          width: '30px',
          height: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.18)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          color: 'var(--error)',
          flexShrink: 0,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Trash2 size={13} />
      </button>
      )}
    </motion.div>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deck: Deck;
}

export function ManageSectionsSheet({ isOpen, onClose, deck }: Props) {
  const { reorderCategories, addCategory, deleteCategory, groupLandsIntoSection } = useDeckStore();
  const [localCats, setLocalCats] = React.useState<string[]>([]);
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const [activeY, setActiveY] = React.useState(0);
  const [newName, setNewName] = React.useState('');
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setLocalCats(initCategories(deck));
      setActiveIndex(null);
      setActiveY(0);
      setNewName('');
      setPendingDelete(null);
    }
  }, [isOpen]);

  const cardCount = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of deck.cards) map[c.category] = (map[c.category] ?? 0) + c.quantity;
    return map;
  }, [deck.cards]);

  function handleDragStart(i: number) {
    setActiveIndex(i);
    setActiveY(0);
  }

  function handleDrag(y: number) {
    setActiveY(y);
  }

  function handleDragEnd() {
    if (activeIndex === null) return;
    const target = clamp(0, localCats.length - 1, activeIndex + Math.round(activeY / ITEM_H));
    const next = [...localCats];
    if (target !== activeIndex) {
      const [moved] = next.splice(activeIndex, 1);
      next.splice(target, 0, moved);
      setLocalCats(next);
      reorderCategories(deck.id, next);
    }
    setActiveIndex(null);
    setActiveY(0);
  }

  function handleDeleteRequest(name: string) {
    setPendingDelete(name);
  }

  function handleDeleteConfirm() {
    if (!pendingDelete) return;
    deleteCategory(deck.id, pendingDelete);
    setLocalCats((prev) => prev.filter((c) => c !== pendingDelete));
    setPendingDelete(null);
  }

  function handleDeleteCancel() {
    setPendingDelete(null);
  }

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed || localCats.includes(trimmed)) return;
    addCategory(deck.id, trimmed);
    setLocalCats((prev) => [...prev, trimmed]);
    setNewName('');
  }

  const canAdd = newName.trim().length > 0 && !localCats.includes(newName.trim());

  const looseLandCount = React.useMemo(
    () =>
      deck.cards
        .filter(
          (c) =>
            c.typeLine?.includes('Land') &&
            c.category !== 'Comandante' &&
            c.category !== 'Lands'
        )
        .reduce((s, c) => s + c.quantity, 0),
    [deck.cards]
  );

  function handleGroupLands() {
    groupLandsIntoSection(deck.id, 'Lands');
    setLocalCats((prev) => (prev.includes('Lands') ? prev : [...prev, 'Lands']));
  }

  return (
    <>
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Gerenciar seções" maxHeight="85dvh">
      <div style={{ padding: '4px 20px 32px' }}>
        {/* Draggable list */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          {localCats.map((name, i) => (
            <DraggableRow
              key={name}
              name={name}
              index={i}
              total={localCats.length}
              cardCount={cardCount[name] ?? 0}
              activeIndex={activeIndex}
              activeY={activeY}
              onDragStart={handleDragStart}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>

        {/* Auto-group lands */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginBottom: '16px' }}>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            leftIcon={<Mountain size={15} />}
            onClick={handleGroupLands}
            disabled={looseLandCount === 0}
          >
            {looseLandCount > 0
              ? `Agrupar ${looseLandCount} terreno${looseLandCount !== 1 ? 's' : ''} em "Lands"`
              : 'Terrenos já agrupados'}
          </Button>
        </div>

        {/* Add new section */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '16px',
            display: 'flex',
            gap: '8px',
          }}
        >
          <Input
            placeholder="Nova seção..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            fullWidth
          />
          <Button variant="primary" size="md" onClick={handleAdd} disabled={!canAdd}>
            <Plus size={15} />
          </Button>
        </div>
      </div>

    </BottomSheet>

    {/* Confirmation dialog — rendered outside BottomSheet to avoid transform clipping */}
    <AnimatePresence>
      {pendingDelete && (
        <>
          <motion.div
            key="confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={handleDeleteCancel}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.45)',
              zIndex: 60,
            }}
          />
          <motion.div
            key="confirm-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 32, mass: 0.8 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
              border: '1px solid var(--border-default)',
              borderBottom: 'none',
              boxShadow: 'var(--shadow-xl)',
              padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              zIndex: 61,
            }}
          >
            <div>
              <p style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                Apagar seção?
              </p>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                {pendingDelete && cardCount[pendingDelete] > 0
                  ? `As ${cardCount[pendingDelete]} carta${cardCount[pendingDelete] !== 1 ? 's' : ''} de "${pendingDelete}" serão movidas para "Outros".`
                  : `A seção "${pendingDelete}" será removida.`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" size="md" onClick={handleDeleteCancel} style={{ flex: 1 }}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleDeleteConfirm}
                style={{ flex: 1, backgroundColor: 'var(--error)', color: '#fff' }}
              >
                <Trash2 size={14} />
                Apagar
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
