import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Search, Receipt, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusBadge, PaymentBadge } from '@/components/common/StatusBadge';
import { useDebounced } from '@/hooks/useDebounced';
import {
  orderApi,
  type Order,
  type OrderStatus,
} from '@/services/orders';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { getErrorMessage } from '@/services/api';

const ALL_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'payment_pending',
  'paid',
  'preparing',
  'delivered',
  'cancelled',
];

export default function OrderList({
  lang,
  refreshKey,
  onOpenOrder,
  onNewInvoice,
}: {
  lang: string;
  refreshKey: number;
  onOpenOrder: (order: Order) => void;
  onNewInvoice: () => void;
}) {
  const { t } = useTranslation();

  const [status, setStatus] = useState<string>('all');
  const [q, setQ] = useState('');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7d'>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQ = useDebounced(q, 350);

  const buildParams = useCallback(
    (p: number) => {
      const params: Record<string, string | number | undefined> = {
        status,
        q: debouncedQ || undefined,
        page: p,
        limit: 20,
      };
      if (dateRange === 'today') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        params.from = start.toISOString();
      } else if (dateRange === '7d') {
        const start = new Date();
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        params.from = start.toISOString();
      }
      return params;
    },
    [status, debouncedQ, dateRange],
  );

  const load = useCallback(
    async (p: number, append: boolean) => {
      if (p === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const res = await orderApi.list(buildParams(p));
        setOrders((prev) => (append ? [...prev, ...res.orders] : res.orders));
        setCounts(res.counts);
        setTotal(res.total);
        setPage(res.page);
      } catch (err) {
        setError(await getErrorMessage(err));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildParams],
  );

  useEffect(() => {
    void load(1, false);
  }, [load, refreshKey]);

  const statusTabs: Array<{ key: string; label: string; count: number }> = [
    { key: 'all', label: t('order.allStatuses'), count: counts.all ?? 0 },
    ...ALL_STATUSES.map((s) => ({
      key: s,
      label: t(`orderStatus.${s}`),
      count: counts[s] ?? 0,
    })),
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 p-8 text-muted-foreground">
        <RefreshCw className="size-4 animate-spin" />
        <span className="text-sm">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      {error && (
        <div className="mx-4 rounded-lg border-2 border-dashed border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('order.searchPlaceholder')}
            className="h-9 w-full rounded-lg border border-border bg-card pr-3 pl-8 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/50"
          />
        </div>

        <div className="flex rounded-lg border border-border bg-card p-0.5">
          {(
            [
              { key: 'all', label: t('common.all') },
              { key: 'today', label: t('common.today') },
              { key: '7d', label: t('common.last7Days') },
            ] as const
          ).map((r) => (
            <button
              key={r.key}
              onClick={() => setDateRange(r.key)}
              className={cn(
                'cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                dateRange === r.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <Button variant="outline" onClick={() => void load(1, false)} className="ml-auto">
          <RefreshCw className="size-4" />
          {t('common.search')}
        </Button>
      </div>

      {/* status tabs */}
      <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            className={cn(
              'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
              status === tab.key
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border/70 bg-card hover:border-primary/40',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                status === tab.key
                  ? 'bg-primary-foreground/20'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* table */}
      {orders.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-card p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
            <Receipt className="size-6" />
          </div>
          <p className="font-hand text-xl font-bold">{t('order.emptyList')}</p>
          <p className="max-w-xs text-sm text-muted-foreground">{t('order.emptyListHint')}</p>
          <Button onClick={onNewInvoice} className="mt-2 font-hand">
            {t('order.newInvoiceBtn')}
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b-2 border-dashed text-left text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  <th className="px-3 py-2">{t('order.invoiceNo')}</th>
                  <th className="px-3 py-2">{t('order.customer')}</th>
                  <th className="px-3 py-2 text-right">{t('order.item')}</th>
                  <th className="px-3 py-2 text-right">{t('order.total')}</th>
                  <th className="hidden px-3 py-2 md:table-cell">{t('order.payment')}</th>
                  <th className="px-3 py-2">{t('order.status')}</th>
                  <th className="hidden px-3 py-2 text-right lg:table-cell">{t('order.date')}</th>
                  <th className="w-8 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => onOpenOrder(order)}
                    className="group cursor-pointer border-b border-dashed/60 transition-colors last:border-b-0 hover:bg-muted/50"
                  >
                    <td className="px-3 py-2.5">
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-hand text-sm font-bold tracking-wide">
                        {order.number}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="max-w-44 truncate font-medium">
                        {order.customer_name || '—'}
                      </p>
                      <p className="max-w-44 truncate text-xs text-muted-foreground">
                        {order.customer_phone || order.customer_address || ''}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">
                      {t('order.itemsCount', { count: order.items.length })}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums">
                      {formatCurrency(order.total_amount, order.currency)}
                    </td>
                    <td className="hidden px-3 py-2.5 md:table-cell">
                      <div className="flex items-center gap-1.5">
                        {order.payment_method && (
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                            {t(`paymentMethod.${order.payment_method}`)}
                          </span>
                        )}
                        <PaymentBadge status={order.payment_status} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="hidden px-3 py-2.5 text-right lg:table-cell">
                      <p className="text-xs font-medium">{formatDateTime(order.created_at, lang)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {order.handled_by || t('placedVia.manual')}
                      </p>
                    </td>
                    <td className="px-2 py-2.5">
                      <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {orders.length > 0 && orders.length < total && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => void load(page + 1, true)}
            disabled={loadingMore}
          >
            {loadingMore ? t('common.loading') : t('order.loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
}
