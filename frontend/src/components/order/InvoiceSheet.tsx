import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Banknote,
  Check,
  Landmark,
  Plus,
  Printer,
  QrCode,
  Repeat,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { catalogApi, type Category, type Product } from '@/services/catalog';
import { orderApi, type Order, type PaymentMethod } from '@/services/orders';
import { formatCurrency, parseQtySyntax } from '@/utils/format';
import { getErrorMessage } from '@/services/api';
import DraftLineRow from './DraftLineRow';
import ProductSuggestions from './ProductSuggestions';
import { createLine, type DraftLine } from './types';

const PAYMENT_METHODS: Array<{ value: PaymentMethod; icon: typeof Banknote }> = [
  { value: 'cash', icon: Banknote },
  { value: 'khqr', icon: QrCode },
  { value: 'bank_transfer', icon: Landmark },
];

const SEARCH_DEBOUNCE_MS = 220;

export default function InvoiceSheet({
  lang,
  open,
  onPlaced,
}: {
  lang: string;
  open: boolean;
  onPlaced: (order: Order) => void;
}) {
  const { t } = useTranslation();

  const [lines, setLines] = useState<DraftLine[]>([]);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [striking, setStriking] = useState<Set<string>>(new Set());

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [note, setNote] = useState('');
  const [discount, setDiscount] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [repeating, setRepeating] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const newInvoiceRef = useRef<HTMLButtonElement>(null);
  const searchSeq = useRef(0);

  // ─── totals ────────────────────────────────────
  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + (l.price ?? 0) * l.quantity, 0),
    [lines],
  );
  const discountNum = Math.max(0, Number(discount) || 0);
  const deliveryNum = Math.max(0, Number(deliveryFee) || 0);
  const total = Math.max(0, subtotal - discountNum + deliveryNum);
  const hasUnpricedNew = lines.some((l) => l.isNew && (l.price === null || l.price < 0));

  // ─── product search (debounced, stale-safe) ────
  useEffect(() => {
    const seq = ++searchSeq.current;
    const normalized = query.trim().toLowerCase().replace(/x\s*\d+$/i, '').trim();
    if (!normalized) {
      setSuggestions([]);
      setSuggesting(false);
      setHighlight(-1);
      return;
    }
    setSuggesting(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await catalogApi.searchProducts(normalized, 6);
        if (searchSeq.current === seq) {
          setSuggestions(res.products);
          setHighlight(res.products.length ? 0 : -1);
        }
      } catch {
        if (searchSeq.current === seq) setSuggestions([]);
      } finally {
        if (searchSeq.current === seq) setSuggesting(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const focusWriteLine = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // focus the write-line whenever the drawer opens
  useEffect(() => {
    if (open) focusWriteLine();
  }, [open, focusWriteLine]);

  const addLine = useCallback(
    (name: string, quantity: number, product?: Product) => {
      const clean = name.trim();
      if (!clean) return;
      setLines((prev) => {
        const existing = product
          ? prev.find((l) => l.product_id === product.id && !l.pending)
          : prev.find((l) => l.name.toLowerCase() === clean.toLowerCase() && l.isNew);
        if (existing) {
          return prev.map((l) =>
            l.id === existing.id
              ? { ...l, quantity: l.quantity + quantity, price: l.price ?? product?.price ?? null }
              : l,
          );
        }
        return [...prev, createLine(clean, quantity, product?.price ?? null, product?.id ?? null)];
      });
      setQuery('');
      setSuggestions([]);
      setHighlight(-1);
      setError(null);
      focusWriteLine();
    },
    [focusWriteLine],
  );

  const commitQuery = useCallback(async () => {
    const { name, quantity } = parseQtySyntax(query);
    if (!name) return;
    if (highlight >= 0 && suggestions[highlight]) {
      const picked = suggestions[highlight];
      addLine(picked.name, quantity, picked);
      return;
    }
    // No suggestions loaded (fast enter before the debounced search answered).
    // Do a blocking check so a known product is never mistyped as new.
    try {
      const res = await catalogApi.searchProducts(name, 3);
      const top = res.products[0];
      if (top && top.match_score && top.match_score >= 70) {
        addLine(top.name, quantity, top);
        return;
      }
    } catch {
      // fall through to new-product line
    }
    // no match → new product line (qty + price are asked inline)
    addLine(name, quantity);
  }, [query, highlight, suggestions, addLine]);

  const removeLine = useCallback((id: string) => {
    setStriking((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      setLines((prev) => prev.filter((l) => l.id !== id));
      setStriking((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 380);
  }, []);

  const changeQty = useCallback((id: string, delta: number) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l)),
    );
  }, []);

  const changePrice = useCallback((id: string, value: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const num = Number(value);
        return { ...l, price: value === '' ? null : Number.isNaN(num) ? l.price : num };
      }),
    );
  }, []);

  const confirmLine = useCallback(
    (id: string, quantity: number) => {
      setLines((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, quantity: Math.max(1, quantity), pending: false } : l,
        ),
      );
      focusWriteLine();
    },
    [focusWriteLine],
  );

  // ─── category quick-add ────────────────────────
  useEffect(() => {
    catalogApi
      .listCategories()
      .then((res) => setCategories(res.categories))
      .catch(() => setCategories([]));
  }, []);

  const toggleCategory = useCallback(
    async (categoryId: string) => {
      if (openCategory === categoryId) {
        setOpenCategory(null);
        setCategoryProducts([]);
        return;
      }
      setOpenCategory(categoryId);
      setLoadingCategory(true);
      setCategoryProducts([]);
      try {
        const res = await catalogApi.searchProducts('', 20, categoryId);
        setCategoryProducts(res.products);
      } catch {
        setCategoryProducts([]);
      } finally {
        setLoadingCategory(false);
      }
    },
    [openCategory],
  );

  const repeatLastOrder = useCallback(async () => {
    setRepeating(true);
    try {
      const res = await orderApi.list({ limit: 1 });
      const last = res.orders[0];
      if (!last) return;
      setLines(
        last.items.map((item) =>
          createLine(item.name, item.quantity, item.unit_price, item.product_id),
        ),
      );
      setCustomerName(last.customer_name ?? '');
      setCustomerPhone(last.customer_phone ?? '');
      setCustomerAddress(last.customer_address ?? '');
      setNote(last.note ?? '');
      setDiscount(last.discount_amount ? String(last.discount_amount) : '');
      setDeliveryFee(last.delivery_fee ? String(last.delivery_fee) : '');
      setError(null);
      focusWriteLine();
    } catch (err) {
      setError(await getErrorMessage(err));
    } finally {
      setRepeating(false);
    }
  }, [focusWriteLine]);

  // ─── place order ───────────────────────────────
  const hasPending = lines.some((l) => l.pending);
  const canPlace = lines.length > 0 && !hasPending && !hasUnpricedNew && !placing;

  const placeOrder = useCallback(async () => {
    if (!canPlace) return;
    setPlacing(true);
    setError(null);
    try {
      const res = await orderApi.create({
        items: lines.map((l) => ({
          name: l.name,
          quantity: l.quantity,
          price: l.price ?? undefined,
          product_id: l.product_id,
        })),
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        customer_address: customerAddress || undefined,
        note: note || undefined,
        discount_amount: discountNum,
        delivery_fee: deliveryNum,
        payment_method: paymentMethod,
      });
      setPlacedOrder(res.order);
      onPlaced(res.order);
    } catch (err) {
      setError(await getErrorMessage(err));
    } finally {
      setPlacing(false);
    }
  }, [
    canPlace,
    lines,
    customerName,
    customerPhone,
    customerAddress,
    note,
    discountNum,
    deliveryNum,
    paymentMethod,
    onPlaced,
  ]);

  const resetInvoice = useCallback(() => {
    setLines([]);
    setQuery('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setNote('');
    setDiscount('');
    setDeliveryFee('');
    setPaymentMethod(null);
    setPlacedOrder(null);
    setError(null);
    focusWriteLine();
  }, [focusWriteLine]);

  // focus "New invoice" once placed
  useEffect(() => {
    if (placedOrder) newInvoiceRef.current?.focus();
  }, [placedOrder]);

  const today = new Intl.DateTimeFormat(lang === 'km' ? 'km-KH' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const stamp = placedOrder
    ? placedOrder.status === 'cancelled'
      ? t('order.stampCancelled')
      : placedOrder.payment_status === 'paid'
        ? t('order.stampPaid')
        : t('order.stampPending')
    : null;
  const stampTone =
    placedOrder?.payment_status === 'paid' ? 'text-emerald-600/80' : 'text-rose-600/70';

  // ─── render ────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      {error && (
        <div className="mx-4 rounded-lg border-2 border-dashed border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid flex-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── the paper ─────────────────────────── */}
        <div className="mx-auto w-full max-w-2xl">
          <div
            className={cn(
              'paper-ruled relative rounded-xl border-2 border-dashed bg-card px-6 pt-5 pb-6 shadow-sm sm:px-8',
              placedOrder && open && 'print-area',
            )}
          >
            {placedOrder && (
              <div
                className={cn(
                  'ink-stamp pointer-events-none absolute top-24 right-6 z-10 rounded-md border-4 px-3 py-1 font-hand text-2xl font-bold tracking-widest uppercase select-none',
                  stampTone,
                )}
              >
                {stamp}
                <span className="mt-0.5 block border-t-2 pt-0.5 font-sans text-[10px] tracking-[0.3em]">
                  {placedOrder.number}
                </span>
              </div>
            )}

            {/* header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-hand text-3xl leading-tight font-bold tracking-tight">
                  {t('order.invoice')}
                </h2>
                <p className="mt-1 text-sm font-semibold">{placedOrder?.shop_name ?? '—'}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>
                  {t('order.date')}: <span className="font-semibold">{today}</span>
                </p>
                <p className="mt-0.5">
                  {t('order.invoiceNo')}:{' '}
                  <span className="font-hand text-sm font-bold text-foreground">
                    {placedOrder?.number ?? '#' + '·'.repeat(6)}
                  </span>
                </p>
              </div>
            </div>

            {/* customer */}
            <div className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {t('order.customerName')}
                </span>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={!!placedOrder}
                  placeholder={t('order.customerName')}
                  className="ink-input w-full py-0.5 text-sm font-medium"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {t('order.phone')}
                </span>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  disabled={!!placedOrder}
                  placeholder={t('order.phone')}
                  inputMode="tel"
                  className="ink-input w-full py-0.5 text-sm font-medium"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {t('order.address')}
                </span>
                <input
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  disabled={!!placedOrder}
                  placeholder={t('order.address')}
                  className="ink-input w-full py-0.5 text-sm font-medium"
                />
              </label>
            </div>

            {/* items */}
            <div className="mt-5">
              <div className="flex items-center gap-3 border-b border-dashed pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                <span className="w-5" />
                <span className="flex-1">{t('order.item')}</span>
                <span className="w-14 text-right">{t('order.qty')}</span>
                <span className="w-20 text-right">{t('order.price')}</span>
                <span className="w-24 text-right">{t('order.amount')}</span>
                <span className="w-5" />
              </div>

              <div className="flex flex-col">
                {lines.map((line) => (
                  <DraftLineRow
                    key={line.id}
                    line={line}
                    readOnly={!!placedOrder}
                    striking={striking.has(line.id)}
                    onChangeQty={changeQty}
                    onChangePrice={changePrice}
                    onConfirm={confirmLine}
                    onRemove={removeLine}
                    onNextLine={focusWriteLine}
                  />
                ))}
              </div>

              {/* write-line input + suggestions */}
              {!placedOrder && (
                <div className="relative mt-2">
                  <div className="flex items-center gap-2">
                    <span className="font-hand text-lg font-bold text-primary">→</span>
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void commitQuery();
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setHighlight((h) => Math.min(suggestions.length - 1, h + 1));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setHighlight((h) => Math.max(-1, h - 1));
                        } else if (e.key === 'Escape') {
                          setSuggestions([]);
                        }
                      }}
                      placeholder={t('order.addItemPlaceholder')}
                      className="ink-input w-full py-1 text-base font-medium"
                    />
                    {parseQtySyntax(query).quantity > 1 && (
                      <span className="ink-tick shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-hand text-sm font-bold text-primary">
                        ×{parseQtySyntax(query).quantity}
                      </span>
                    )}
                  </div>

                  <ProductSuggestions
                    query={query}
                    suggestions={suggestions}
                    suggesting={suggesting}
                    highlight={highlight}
                    onHover={setHighlight}
                    onPick={(product) =>
                      addLine(product.name, parseQtySyntax(query).quantity, product)
                    }
                    onAddNew={() => void commitQuery()}
                  />
                </div>
              )}
            </div>

            {/* totals */}
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex items-center justify-end gap-3">
                <span className="text-muted-foreground">{t('order.subtotal')}</span>
                <span className="w-28 text-right font-medium tabular-nums">
                  {formatCurrency(subtotal, 'KHR')}
                </span>
              </div>
              <div className="flex items-center justify-end gap-3">
                <span className="text-muted-foreground">{t('order.discount')}</span>
                {placedOrder ? (
                  <span className="w-28 text-right font-medium text-rose-600 tabular-nums">
                    −{formatCurrency(placedOrder.discount_amount, 'KHR')}
                  </span>
                ) : (
                  <input
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="0"
                    inputMode="decimal"
                    className="ink-input w-28 text-right font-medium tabular-nums"
                  />
                )}
              </div>
              <div className="flex items-center justify-end gap-3">
                <span className="text-muted-foreground">{t('order.deliveryFee')}</span>
                {placedOrder ? (
                  <span className="w-28 text-right font-medium tabular-nums">
                    {formatCurrency(placedOrder.delivery_fee, 'KHR')}
                  </span>
                ) : (
                  <input
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="0"
                    inputMode="decimal"
                    className="ink-input w-28 text-right font-medium tabular-nums"
                  />
                )}
              </div>
              <div className="flex items-center justify-end gap-3 pt-1.5">
                <span className="font-hand text-lg font-bold tracking-tight">
                  {t('order.total')}
                </span>
                <span className="border-b-4 border-double px-1 text-right text-lg font-extrabold tabular-nums">
                  {formatCurrency(placedOrder ? placedOrder.total_amount : total, 'KHR')}
                </span>
              </div>
            </div>

            {/* note */}
            {placedOrder?.note ? (
              <p className="mt-4 border-t border-dashed pt-2 text-xs italic text-muted-foreground">
                {placedOrder.note}
              </p>
            ) : (
              <div className="mt-4">
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {t('order.note')}
                </span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('order.note')}
                  className="ink-input w-full py-0.5 text-xs italic"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── right rail: checkout + quick-add ──── */}
        <aside className="flex flex-col gap-4 xl:sticky xl:top-4">
          {/* checkout card */}
          <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            {placedOrder ? (
              <>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {t('order.placed')} {placedOrder.number}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t('order.itemsCount', { count: placedOrder.items.length })} ·{' '}
                  {formatCurrency(placedOrder.total_amount, 'KHR')}
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    ref={newInvoiceRef}
                    onClick={resetInvoice}
                    size="lg"
                    className="w-full font-hand text-base"
                  >
                    <Sparkles className="size-4" />
                    {t('order.newInvoiceBtn')}
                  </Button>
                  <Button onClick={() => window.print()} variant="outline" size="lg">
                    <Printer />
                    {t('order.print')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-end justify-between gap-2">
                  <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {t('order.total')}
                  </span>
                  <span className="font-hand text-2xl leading-none font-bold tracking-tight tabular-nums">
                    {formatCurrency(total, 'KHR')}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {PAYMENT_METHODS.map(({ value, icon: Icon }) => {
                    const selected = paymentMethod === value;
                    return (
                      <button
                        key={value}
                        onClick={() => setPaymentMethod(value)}
                        className={cn(
                          'flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all',
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border/70 bg-card hover:border-primary/50 hover:text-foreground',
                        )}
                      >
                        <Icon className="size-3.5" />
                        {t(`paymentMethod.${value}`)}
                        {selected && <Check className="size-3" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>

                <Button
                  onClick={placeOrder}
                  disabled={!canPlace}
                  size="lg"
                  className="mt-3 w-full font-hand text-base"
                >
                  {placing ? t('common.loading') : t('order.placeOrder')}
                </Button>

                {hasUnpricedNew && (
                  <p className="mt-2 text-center text-xs font-semibold text-violet-600 dark:text-violet-400">
                    {t('order.priceRequired')}
                  </p>
                )}
                {hasPending && (
                  <p className="mt-2 text-center text-xs font-semibold text-violet-600 dark:text-violet-400">
                    {t('order.confirmNewProduct')}
                  </p>
                )}

                <div className="mt-2 flex gap-2">
                  <Button onClick={repeatLastOrder} variant="outline" size="sm" disabled={repeating}>
                    <Repeat className="size-3.5" />
                    {t('order.repeatLast')}
                  </Button>
                  <Button
                    onClick={resetInvoice}
                    variant="ghost"
                    size="sm"
                    disabled={lines.length === 0}
                  >
                    <Trash2 className="size-3.5" />
                    {t('order.clearAll')}
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* quick-add card */}
          {!placedOrder && (
            <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
              <h3 className="font-hand text-lg font-bold tracking-tight">
                {t('order.quickAdd')}
              </h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {categories.length === 0 && (
                  <p className="text-xs text-muted-foreground">{t('category.emptyHint')}</p>
                )}
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleCategory(c.id)}
                    className={cn(
                      'cursor-pointer rounded-full border px-2.5 py-1 text-xs font-semibold transition-all',
                      openCategory === c.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border/70 hover:border-primary/50',
                    )}
                  >
                    {c.name}
                    <span className="ml-1 opacity-60">{c.product_count}</span>
                  </button>
                ))}
              </div>

              {loadingCategory && (
                <p className="mt-3 text-xs text-muted-foreground">{t('common.loading')}</p>
              )}
              {!loadingCategory && openCategory && categoryProducts.length === 0 && (
                <p className="mt-3 text-xs text-muted-foreground">{t('order.emptyCategory')}</p>
              )}
              {!loadingCategory &&
                openCategory &&
                categoryProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addLine(p.name, 1, p)}
                    className="group flex w-full cursor-pointer items-center justify-between gap-2 border-b border-dashed/70 py-1.5 text-left transition-colors hover:bg-muted/60"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatCurrency(p.price, 'KHR')}
                    </span>
                    <Plus className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                ))}
              {!loadingCategory && openCategory && categoryProducts.length === 20 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('order.moreProducts', { count: 20 })}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* ── mobile sticky checkout bar ──────────── */}
      {!placedOrder && (
        <div className="sticky bottom-0 z-30 -mx-4 -mb-4 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.2)] xl:hidden">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              {t('order.total')}
            </p>
            <p className="font-hand text-xl leading-none font-bold tracking-tight tabular-nums">
              {formatCurrency(total, 'KHR')}
            </p>
          </div>
          <Button
            onClick={placeOrder}
            disabled={!canPlace}
            size="lg"
            className="font-hand text-base"
          >
            {placing ? t('common.loading') : t('order.placeOrder')}
          </Button>
        </div>
      )}
    </div>
  );
}
