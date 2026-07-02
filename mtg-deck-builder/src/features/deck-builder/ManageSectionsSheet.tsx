import React from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import { useDrag } from '@use-gesture/react';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { Deck } from '../../types';
import { useDeckStore } from '../../store/useDeckStore';

const ITEM_H = 52;
const DEFAULT_ORDER = [
  'Comandante', 'Terrenos', 'Ramp', 'Compra de Cartas',
  'Remoção', 'Proteção', 'Wincons', 'Outros',
];

function clamp(min: number, max: number, val: number) {
  return Math.max(min, Math.min(max, val));
}

function initCategories(deck: Deck): string[] {
  if (deck.categories && deck.categories.length > 0) return [...deck.categories];
  const present = new Set(deck.cards.map((c) => c.category));
  return [
    ...DEFAULT_ORDER.filter((c) => present.has(c)),
    ...[...present].filter((c) => !DEFAULT_ORDER.includes(c)),
  ];
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
    </motion.div>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deck: Deck;
}

export function ManageSectionsSheet({ isOpen, onClose, deck }: Props) {
  const { reorderCategories, addCategory, deleteCategory } = useDeckStore();
  const [localCats, setLocalCats] = React.useState<string[]>([]);
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const [activeY, setActiveY] = React.useState(0);
  const [newName, setNewName] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setLocalCats(initCategories(deck));
      setActiveIndex(null);
      setActiveY(0);
      setNewName('');
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

  function handleDelete(name: string) {
    deleteCategory(deck.id, name);
    setLocalCats((prev) => prev.filter((c) => c !== name));
  }

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed || localCats.includes(trimmed)) return;
    addCategory(deck.id, trimmed);
    setLocalCats((prev) => [...prev, trimmed]);
    setNewName('');
  }

  const canAdd = newName.trim().length > 0 && !localCats.includes(newName.trim());

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Gerenciar seções" maxHeight="85vh">
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
              onDelete={handleDelete}
            />
          ))}
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
  );
}
