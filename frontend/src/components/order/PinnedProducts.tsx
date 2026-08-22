import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical, Pin, Plus, Search, X } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { catalogApi, type Product } from '@/services/catalog';
import { formatCurrency } from '@/utils/format';

export default function PinnedProducts({
  pinned,
  loading,
  onAddToOrder,
  onPin,
  onUnpin,
  onReorder,
}: {
  pinned: Product[];
  loading: boolean;
  onAddToOrder: (product: Product) => void;
  onPin: (product: Product) => void;
  onUnpin: (product: Product) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [items, setItems] = useState<string[]>([]);
  const itemsRef = useRef<string[]>([]);
  itemsRef.current = items;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const byId = useMemo(() => new Map(pinned.map((p) => [p.id, p])), [pinned]);
  const pinnedIds = useMemo(() => new Set(pinned.map((p) => p.id)), [pinned]);

  useEffect(() => {
    setItems(pinned.map((p) => p.id));
  }, [pinned]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const ids = itemsRef.current;
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      if (from >= 0 && to >= 0) {
        const next = arrayMove(ids, from, to);
        setItems(next);
        itemsRef.current = next;
        onReorder(next);
      }
    }
  };

  const activeProduct = activeId ? byId.get(activeId) : null;

  return (
    <div className="flex flex-col rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-hand text-lg font-bold tracking-tight">{t('order.pinnedProducts')}</h3>
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setSearchOpen((open) => !open)}
            aria-label={t('order.addPinned')}
            className={cn('size-7', searchOpen && 'border-primary/60 bg-primary/10 text-primary')}
          >
            <Plus className={cn('size-4', searchOpen && 'rotate-45')} />
          </Button>
          <Pin className="size-4 text-muted-foreground" />
        </div>
      </div>

      <p className="mt-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        {t('order.dragToReorder')}
      </p>

      {searchOpen && (
        <PinSearch
          pinnedIds={pinnedIds}
          onPick={onPin}
          onClose={() => setSearchOpen(false)}
        />
      )}

      <div
        className={cn(
          'mt-3 flex flex-col gap-1.5 overflow-y-auto pr-1',
          searchOpen ? 'h-[16rem]' : 'h-[22rem]',
        )}
      >
        {loading && pinned.length === 0 && (
          <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
        )}
        {!loading && pinned.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
            <Pin className="size-5 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground">{t('order.noPinnedHint')}</p>
          </div>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {items.map((id) => {
              const product = byId.get(id);
              if (!product) return null;
              return (
                <PinnedRow
                  key={product.id}
                  product={product}
                  onAddToOrder={onAddToOrder}
                  onUnpin={onUnpin}
                />
              );
            })}
          </SortableContext>
          <DragOverlay>
            {activeProduct && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/50 bg-card px-1.5 py-1.5 shadow-xl opacity-95">
                <PinnedRowInner product={activeProduct} onAddToOrder={onAddToOrder} onUnpin={onUnpin} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

function PinnedRow({
  product,
  onAddToOrder,
  onUnpin,
}: {
  product: Product;
  onAddToOrder: (product: Product) => void;
  onUnpin: (product: Product) => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-dashed/70 bg-background px-1.5 py-1.5 transition-colors hover:bg-muted/40',
        isDragging && 'opacity-30 ring-2 ring-primary/30',
      )}
    >
      <span
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab text-muted-foreground/50 active:cursor-grabbing"
        title={t('order.dragToReorder')}
      >
        <GripVertical className="size-4" />
      </span>
      <PinnedRowInner product={product} onAddToOrder={onAddToOrder} onUnpin={onUnpin} />
    </div>
  );
}

function PinnedRowInner({
  product,
  onAddToOrder,
  onUnpin,
}: {
  product: Product;
  onAddToOrder: (product: Product) => void;
  onUnpin: (product: Product) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <button
        onClick={() => onAddToOrder(product)}
        className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{product.name}</span>
        <span className="shrink-0 text-xs font-semibold tabular-nums">
          {formatCurrency(product.price, 'KHR')}
        </span>
      </button>
      <button
        onClick={() => onAddToOrder(product)}
        aria-label={t('order.addProduct')}
        className="shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
      >
        <Plus className="size-3.5" />
      </button>
      <button
        onClick={() => onUnpin(product)}
        aria-label={t('order.unpin')}
        className="shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-500"
      >
        <Pin className="size-3.5 fill-current" />
      </button>
    </>
  );
}

function PinSearch({
  pinnedIds,
  onPick,
  onClose,
}: {
  pinnedIds: Set<string>;
  onPick: (product: Product) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const id = ++seq.current;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await catalogApi.searchProducts(q, 20);
        if (seq.current === id) {
          setResults(res.products.filter((p) => !pinnedIds.has(p.id)));
        }
      } catch {
        if (seq.current === id) setResults([]);
      } finally {
        if (seq.current === id) setSearching(false);
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query, pinnedIds]);

  return (
    <div className="mt-3 rounded-lg border border-dashed/70 bg-background p-2">
      <div className="flex items-center gap-2">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('order.pinSearchPlaceholder')}
          className="ink-input w-full py-1 text-sm font-medium"
        />
        <button
          onClick={onClose}
          aria-label={t('common.close')}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/60"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-2 flex max-h-44 flex-col gap-1 overflow-y-auto pr-0.5">
        {searching && <p className="text-xs text-muted-foreground">{t('common.loading')}</p>}
        {!searching && query.trim() && results.length === 0 && (
          <p className="text-xs text-muted-foreground">{t('order.noResults')}</p>
        )}
        {!query.trim() && (
          <p className="text-xs text-muted-foreground">{t('order.pinSearchPlaceholder')}</p>
        )}
        {results.map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/60"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
            <span className="shrink-0 text-xs font-semibold tabular-nums">
              {formatCurrency(p.price, 'KHR')}
            </span>
            <Plus className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}