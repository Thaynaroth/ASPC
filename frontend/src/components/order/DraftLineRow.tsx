import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Minus, PackagePlus, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import type { DraftLine } from './types';

export default function DraftLineRow({
  line,
  index,
  readOnly,
  striking,
  focusQty,
  onChangeQty,
  onChangeQtyValue,
  onChangePrice,
  onConfirm,
  onRemove,
  onNextLine,
}: {
  line: DraftLine;
  index: number;
  readOnly: boolean;
  striking: boolean;
  focusQty?: boolean;
  onChangeQty: (id: string, delta: number) => void;
  onChangeQtyValue: (id: string, value: string) => void;
  onChangePrice: (id: string, value: string) => void;
  onConfirm: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onNextLine: () => void;
}) {
  const { t } = useTranslation();
  const [qtyDraft, setQtyDraft] = useState(String(line.quantity));
  const priceRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  const focusQtyInput = () => {
    qtyRef.current?.focus();
    qtyRef.current?.select();
  };

  // force focus onto qty when a new-product line is added — sync + rAF + timeout
  // so no later focus call (async addLine, drawer focus, etc.) can steal it
  useEffect(() => {
    if (!line.pending) return;
    focusQtyInput();
    const raf = requestAnimationFrame(focusQtyInput);
    const timer = window.setTimeout(focusQtyInput, 0);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
    // mount-only: a line is either pending at birth or never becomes pending
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // focus qty after a known product is added to the list
  useEffect(() => {
    if (focusQty && !line.pending) {
      focusQtyInput();
    }
  }, [focusQty, line.pending]);

  // keep the draft in sync when quantity changes externally (merge/stepper)
  useEffect(() => {
    setQtyDraft(String(line.quantity));
  }, [line.quantity]);

  const stepperClass =
    'cursor-pointer rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground disabled:opacity-0 pointer-coarse:opacity-100';

  // ── pending entry: room to type qty + price, then confirm with ✓
  if (line.pending && !readOnly) {
    return (
      <div
        className={cn(
          'mt-1 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 px-2 py-2',
          striking && 'ink-strike ink-striking',
        )}
      >
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {line.name}
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600 ring-1 ring-violet-500/20 dark:text-violet-400">
              <PackagePlus className="size-3" />
              {t('order.newProduct')}
            </span>
          </span>

          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            {t('order.qty')}
            <input
              ref={qtyRef}
              autoFocus
              value={qtyDraft}
              onChange={(e) => setQtyDraft(e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  priceRef.current?.focus();
                }
              }}
              inputMode="numeric"
              className="h-8 w-14 rounded-md border-2 border-dashed border-input bg-card px-2 text-right text-sm font-semibold tabular-nums outline-none focus:border-ring"
            />
          </label>

          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            {t('order.price')}
            <input
              ref={priceRef}
              value={line.price ?? ''}
              onChange={(e) => onChangePrice(line.id, e.target.value.replace(/[^\d.]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault();
                  onConfirm(line.id, Number(qtyDraft) || 1);
                }
              }}
              placeholder="៛"
              inputMode="decimal"
              className="h-8 w-24 rounded-md border-2 border-dashed border-input bg-card px-2 text-right text-sm font-semibold tabular-nums outline-none placeholder:text-muted-foreground focus:border-ring"
            />
          </label>

          <button
            onClick={() => onConfirm(line.id, Number(qtyDraft) || 1)}
            disabled={line.price === null || line.price < 0}
            aria-label={t('order.addProduct')}
            className="flex size-8 cursor-pointer items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm transition-opacity disabled:opacity-40"
          >
            <Check className="size-4" strokeWidth={3} />
          </button>

          <button
            onClick={() => onRemove(line.id)}
            aria-label={t('common.delete')}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ── normal line ──
  return (
    <div
      className={cn(
        'group flex items-center gap-3 border-b border-dashed/70 py-1.5',
        striking && 'ink-strike ink-striking',
      )}
    >
      <span className="flex w-5 justify-center">
        <span className="rounded-full bg-primary/10 px-1 text-[10px] font-bold text-primary tabular-nums">
          {index + 1}
        </span>
      </span>

      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {line.name}
        {line.isNew && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600 ring-1 ring-violet-500/20 dark:text-violet-400">
            <PackagePlus className="size-3" />
            {t('order.newProduct')}
          </span>
        )}
      </span>

      <span className="flex w-16 items-center justify-end gap-0.5">
        <button
          onClick={() => onChangeQty(line.id, -1)}
          disabled={readOnly}
          aria-label="−"
          className={stepperClass}
        >
          <Minus className="size-3.5" />
        </button>
        <input
          ref={qtyRef}
          value={qtyDraft}
          disabled={readOnly}
          onChange={(e) => setQtyDraft(e.target.value.replace(/[^\d]/g, ''))}
          onBlur={() => onChangeQtyValue(line.id, qtyDraft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onChangeQtyValue(line.id, qtyDraft);
              priceRef.current?.focus();
            }
          }}
          inputMode="numeric"
          aria-label={t('order.qty')}
          className="w-9 rounded border-2 border-dashed border-transparent bg-transparent py-0.5 text-center text-sm font-semibold tabular-nums outline-none transition-colors hover:border-muted focus:border-ring focus:bg-card"
        />
        <button
          onClick={() => onChangeQty(line.id, 1)}
          disabled={readOnly}
          aria-label="+"
          className={stepperClass}
        >
          <Plus className="size-3.5" />
        </button>
      </span>

      <span className="w-20 text-right">
        {readOnly ? (
          <span className="text-sm tabular-nums">{formatCurrency(line.price, 'KHR')}</span>
        ) : (
          <input
            ref={priceRef}
            value={line.price ?? ''}
            onChange={(e) => onChangePrice(line.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onNextLine();
              }
            }}
            placeholder={line.isNew ? '៛' : formatCurrency(line.price, 'KHR')}
            inputMode="decimal"
            aria-label={t('order.price')}
            className={cn(
              'w-full rounded border-2 border-dashed border-transparent text-right text-sm font-medium tabular-nums outline-none transition-colors hover:border-muted focus:border-ring',
              line.isNew ? 'border-primary/40 bg-primary/5 px-1 font-semibold' : 'px-1',
            )}
          />
        )}
      </span>

      <span className="w-24 text-right text-sm font-bold tabular-nums">
        {formatCurrency((line.price ?? 0) * line.quantity, 'KHR')}
      </span>

      <span className="flex w-5 justify-end">
        {!readOnly && (
          <button
            onClick={() => onRemove(line.id)}
            aria-label={t('common.delete')}
            className="cursor-pointer rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-600 pointer-coarse:opacity-100"
          >
            <X className="size-3.5" />
          </button>
        )}
      </span>
    </div>
  );
}
