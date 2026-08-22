import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Banknote,
  Check,
  Landmark,
  Phone,
  Printer,
  QrCode,
  Repeat,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { catalogApi, type Product } from '@/services/catalog';
import { customerApi, type Customer } from '@/services/customers';
import { orderApi, type Order, type OrderStatus, type PaymentMethod } from '@/services/orders';
import {
  formatCurrency,
  formatKhmerPhone,
  digitsOnlyPhone,
  parseQtySyntax,
} from '@/utils/format';
import { useDebounced } from '@/hooks/useDebounced';
import { getErrorMessage } from '@/services/api';
import DraftLineRow from './DraftLineRow';
import ProductSuggestions from './ProductSuggestions';
import CustomerSuggestions from './CustomerSuggestions';
import PinnedProducts from './PinnedProducts';
import { createLine, type DraftLine } from './types';

const PAYMENT_METHODS: Array<{ value: PaymentMethod; icon: typeof Banknote }> = [
  { value: 'cash', icon: Banknote },
  { value: 'khqr', icon: QrCode },
  { value: 'bank_transfer', icon: Landmark },
];

const SEARCH_DEBOUNCE_MS = 220;
const CUSTOMER_SAVE_DEBOUNCE_MS = 500;

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'pending',
  'processing',
  'confirmed',
  'preparing',
  'delivered',
  'paid',
];

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
  const [inputFocused, setInputFocused] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [customerSuggesting, setCustomerSuggesting] = useState(false);
  const [customerHighlight, setCustomerHighlight] = useState(-1);
  const customerSavedRef = useRef<{ name: string; address: string }>({ name: '', address: '' });
  const pickedPhoneRef = useRef('');

  const [note, setNote] = useState('');
  const [discount, setDiscount] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [status, setStatus] = useState<OrderStatus>('processing');

  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pinned, setPinned] = useState<Product[]>([]);
  const [loadingPinned, setLoadingPinned] = useState(false);
  const [focusLineId, setFocusLineId] = useState<string | null>(null);
  const [repeating, setRepeating] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const newInvoiceRef = useRef<HTMLButtonElement>(null);
  const searchSeq = useRef(0);
  const customerSeq = useRef(0);

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

  // pinned products shown when the write-line is empty and focused
  useEffect(() => {
    if (!query.trim()) setHighlight(inputFocused && pinned.length ? 0 : -1);
  }, [query, pinned, inputFocused]);

  const visibleSuggestions = useMemo(
    () => (query.trim() ? suggestions : inputFocused ? pinned : []),
    [query, suggestions, pinned, inputFocused],
  );

  const focusWriteLine = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // focus the phone number first whenever the drawer opens / a new order starts
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        if (placedOrder) newInvoiceRef.current?.focus();
        else phoneRef.current?.focus();
      });
    }
  }, [open, placedOrder]);

  const addLine = useCallback(
    (name: string, quantity: number, product?: Product) => {
      const clean = name.trim();
      if (!clean) return;
      const existing = product
        ? lines.find((l) => l.product_id === product.id && !l.pending)
        : lines.find((l) => l.name.toLowerCase() === clean.toLowerCase() && l.isNew);
      if (existing) {
        setLines((prev) =>
          prev.map((l) =>
            l.id === existing.id
              ? { ...l, quantity: l.quantity + quantity, price: l.price ?? product?.price ?? null }
              : l,
          ),
        );
        setQuery('');
        setSuggestions([]);
        setHighlight(-1);
        setError(null);
        if (product) focusWriteLine();
        return;
      }
      const line = createLine(clean, quantity, product?.price ?? null, product?.id ?? null);
      setLines((prev) => [...prev, line]);
      setQuery('');
      setSuggestions([]);
      setHighlight(-1);
      setError(null);
      // known product → focus its qty input (new product auto-focuses its own qty)
      if (product) setFocusLineId(line.id);
    },
    [lines, focusWriteLine],
  );

  const commitQuery = useCallback(async () => {
    const { name, quantity } = parseQtySyntax(query);
    if (highlight >= 0 && visibleSuggestions[highlight]) {
      const picked = visibleSuggestions[highlight];
      addLine(picked.name, quantity, picked);
      return;
    }
    if (!name) return;
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
  }, [query, highlight, visibleSuggestions, addLine]);

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

  const setQtyValue = useCallback((id: string, value: string) => {
    const num = parseInt(value.replace(/\D/g, ''), 10);
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, quantity: Number.isNaN(num) ? 1 : Math.max(1, num) } : l)),
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

  // ─── pinned products quick-add ─────────────────
  const loadPinned = useCallback(async () => {
    setLoadingPinned(true);
    try {
      const res = await catalogApi.listPinned();
      setPinned(res.products);
    } catch {
      setPinned([]);
    } finally {
      setLoadingPinned(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadPinned();
  }, [open, loadPinned]);

  const togglePin = useCallback(
    async (product: Product) => {
      const next = !product.is_pinned;
      if (next) {
        setPinned((prev) => [...prev, { ...product, is_pinned: true }]);
      } else {
        setPinned((prev) => prev.filter((p) => p.id !== product.id));
      }
      try {
        await catalogApi.togglePin(product.id, next);
      } catch {
        void loadPinned();
      }
    },
    [],
  );

  const reorderPinned = useCallback(async (orderedIds: string[]) => {
    setPinned((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      return orderedIds
        .map((id) => byId.get(id))
        .filter((p): p is Product => !!p);
    });
    try {
      await catalogApi.reorderPinned(orderedIds);
    } catch {
      void loadPinned();
    }
  }, [loadPinned]);

  // ─── customer search (debounced, stale-safe) ───
  useEffect(() => {
    const seq = ++customerSeq.current;
    const digits = digitsOnlyPhone(customerPhone);
    if (digits.length < 3 || customerPhone === pickedPhoneRef.current) {
      setCustomerSuggestions([]);
      setCustomerSuggesting(false);
      setCustomerHighlight(-1);
      return;
    }
    setCustomerSuggesting(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await customerApi.search(digits, 6);
        if (customerSeq.current === seq) {
          setCustomerSuggestions(res.customers);
          setCustomerHighlight(res.customers.length ? 0 : -1);
        }
      } catch {
        if (customerSeq.current === seq) setCustomerSuggestions([]);
      } finally {
        if (customerSeq.current === seq) setCustomerSuggesting(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [customerPhone]);

  const pickCustomer = useCallback((customer: Customer) => {
    setCustomerId(customer.id);
    setCustomerName(customer.name ?? '');
    setCustomerPhone(formatKhmerPhone(customer.phone ?? ''));
    setCustomerAddress(customer.address ?? '');
    customerSavedRef.current = { name: customer.name ?? '', address: customer.address ?? '' };
    pickedPhoneRef.current = formatKhmerPhone(customer.phone ?? '');
    setCustomerSuggestions([]);
    setCustomerHighlight(-1);
  }, []);

  // dirty when the picked customer's name/address diverge from what was saved
  const customerDirty =
    !!customerId &&
    (customerName.trim() !== customerSavedRef.current.name ||
      customerAddress.trim() !== customerSavedRef.current.address);

  // keep the selected customer's name/address in sync when the user edits them
  const debouncedCustomerName = useDebounced(customerName, CUSTOMER_SAVE_DEBOUNCE_MS);
  const debouncedCustomerAddress = useDebounced(customerAddress, CUSTOMER_SAVE_DEBOUNCE_MS);

  useEffect(() => {
    if (!customerId) return;
    const next = {
      name: debouncedCustomerName.trim(),
      address: debouncedCustomerAddress.trim(),
    };
    if (next.name === customerSavedRef.current.name && next.address === customerSavedRef.current.address) {
      return;
    }
    customerSavedRef.current = next;
    customerApi
      .update(customerId, next)
      .catch(() => {
        /* silent — next order place re-upserts */
      });
  }, [customerId, debouncedCustomerName, debouncedCustomerAddress]);

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
      setCustomerPhone(formatKhmerPhone(last.customer_phone ?? ''));
      setCustomerAddress(last.customer_address ?? '');
      setCustomerId(null);
      pickedPhoneRef.current = '';
      customerSavedRef.current = { name: '', address: '' };
      setNote(last.note ?? '');
      setDiscount(last.discount_amount ? String(last.discount_amount) : '');
      setDeliveryFee(last.delivery_fee ? String(last.delivery_fee) : '');
      setStatus(last.status === 'cancelled' || last.status === 'payment_pending' ? 'processing' : last.status);
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
        customer_phone: digitsOnlyPhone(customerPhone) || undefined,
        customer_address: customerAddress || undefined,
        note: note || undefined,
        discount_amount: discountNum,
        delivery_fee: deliveryNum,
        payment_method: paymentMethod,
        status,
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
    status,
    onPlaced,
  ]);

  const resetInvoice = useCallback(() => {
    setLines([]);
    setQuery('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerId(null);
    setCustomerSuggestions([]);
    pickedPhoneRef.current = '';
    customerSavedRef.current = { name: '', address: '' };
    setNote('');
    setDiscount('');
    setDeliveryFee('');
    setPaymentMethod(null);
    setStatus('processing');
    setPlacedOrder(null);
    setError(null);
    requestAnimationFrame(() => phoneRef.current?.focus());
  }, []);

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

      <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── the paper ─────────────────────────── */}
        <div className="w-full">
          <div
            className={cn(
              'relative rounded-xl border-2 border-dashed bg-card px-6 pt-5 pb-6 shadow-sm sm:px-8',
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
            <div className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <label className="relative block">
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {t('order.phone')}
                </span>
                <input
                  ref={phoneRef}
                  value={customerPhone}
                  onChange={(e) => {
                    pickedPhoneRef.current = '';
                    setCustomerPhone(formatKhmerPhone(e.target.value));
                    setCustomerId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customerHighlight >= 0 && customerSuggestions[customerHighlight]) {
                      e.preventDefault();
                      pickCustomer(customerSuggestions[customerHighlight]);
                    } else if (e.key === 'ArrowDown' && customerSuggestions.length) {
                      e.preventDefault();
                      setCustomerHighlight((h) => Math.min(customerSuggestions.length - 1, h + 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setCustomerHighlight((h) => Math.max(-1, h - 1));
                    } else if (e.key === 'Escape') {
                      setCustomerSuggestions([]);
                    }
                  }}
                  disabled={!!placedOrder}
                  placeholder="0xx xxx xxx"
                  inputMode="tel"
                  className="ink-input w-full py-0.5 text-sm font-semibold"
                />
                <CustomerSuggestions
                  suggestions={customerSuggestions}
                  suggesting={customerSuggesting}
                  highlight={customerHighlight}
                  onHover={setCustomerHighlight}
                  onPick={pickCustomer}
                />
              </label>
              <label className="block">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {t('order.customerName')}
                  {customerDirty && (
                    <span
                      title={t('order.customerDirtyHint')}
                      className="size-2 rounded-full bg-amber-400 shadow-[0_0_0_2px_theme(colors.amber.400/25)]"
                    />
                  )}
                </span>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={!!placedOrder}
                  placeholder={t('order.customerName')}
                  className="ink-input w-full py-0.5 text-sm font-medium"
                />
              </label>
              <label className="block sm:col-span-2">
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
                {lines.map((line, i) => (
                  <DraftLineRow
                    key={line.id}
                    line={line}
                    index={i}
                    readOnly={!!placedOrder}
                    striking={striking.has(line.id)}
                    focusQty={focusLineId === line.id}
                    onChangeQty={changeQty}
                    onChangeQtyValue={setQtyValue}
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
                      onFocus={() => setInputFocused(true)}
                      onBlur={() => setInputFocused(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void commitQuery();
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setHighlight((h) => Math.min(visibleSuggestions.length - 1, h + 1));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setHighlight((h) => Math.max(-1, h - 1));
                        } else if (e.key === 'Escape') {
                          setSuggestions([]);
                          setHighlight(-1);
                          inputRef.current?.blur();
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
                    suggestions={visibleSuggestions}
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

                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {PAYMENT_METHODS.map(({ value, icon: Icon }) => {
                    const selected = paymentMethod === value;
                    return (
                      <button
                        key={value}
                        onClick={() => setPaymentMethod(value)}
                        className={cn(
                          'flex min-w-0 cursor-pointer items-center justify-center gap-1 rounded-full border px-1.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-all',
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border/70 bg-card hover:border-primary/50 hover:text-foreground',
                        )}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        <span className="truncate">{t(`paymentMethod.${value}`)}</span>
                        {selected && <Check className="size-3 shrink-0" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-dashed border-border/70 bg-background px-2.5 py-1.5">
                  <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {t('order.status')}
                  </span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as OrderStatus)}
                    className="cursor-pointer rounded-md border-2 border-dashed border-input bg-card px-2 py-0.5 text-sm font-semibold outline-none focus:border-ring"
                  >
                    {ORDER_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {t(`orderStatus.${s}`)}
                      </option>
                    ))}
                  </select>
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

          {/* pinned products card */}
          {!placedOrder && (
            <PinnedProducts
              pinned={pinned}
              loading={loadingPinned}
              onAddToOrder={(product) => addLine(product.name, 1, product)}
              onPin={(product) => void togglePin(product)}
              onUnpin={(product) => void togglePin(product)}
              onReorder={(orderedIds) => void reorderPinned(orderedIds)}
            />
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
