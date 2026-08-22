import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Receipt, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusBadge, PaymentBadge } from '@/components/common/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { orderApi, type Order } from '@/services/orders';
import { formatCurrency, formatDateTime } from '@/utils/format';

const STATUS_FILTERS = [
  { key: 'all', label: 'order.allStatuses' },
  { key: 'pending', label: 'orderStatus.pending' },
  { key: 'processing', label: 'orderStatus.processing' },
  { key: 'paid', label: 'orderStatus.paid' },
  { key: 'cancelled', label: 'orderStatus.cancelled' },
] as const;

interface OrderTableResult {
  rows: Order[];
  total: number;
  counts: Record<string, number>;
}

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
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [reloadToken, setReloadToken] = useState(0);

  const columns: DataTableColumn<Order>[] = [
    {
      key: 'number',
      header: t('order.invoiceNo'),
      sortable: true,
      sortKey: 'order_number',
      cell: (order) => (
        <span className="rounded-md bg-muted px-1.5 py-0.5 font-hand text-sm font-bold tracking-wide">
          {order.number}
        </span>
      ),
    },
    {
      key: 'customer',
      header: t('order.customer'),
      sortable: true,
      sortKey: 'customer_name',
      cell: (order) => (
        <>
          <p className="max-w-44 truncate font-medium">{order.customer_name || '—'}</p>
          <p className="max-w-44 truncate text-xs text-muted-foreground">
            {order.customer_phone || order.customer_address || ''}
          </p>
        </>
      ),
    },
    {
      key: 'item',
      header: t('order.item'),
      align: 'right',
      cell: (order) => (
        <span className="text-xs text-muted-foreground">
          {t('order.itemsCount', { count: order.items.length })}
        </span>
      ),
    },
    {
      key: 'total',
      header: t('order.total'),
      align: 'right',
      sortable: true,
      sortKey: 'total_amount',
      cell: (order) => (
        <span className="font-bold tabular-nums">
          {formatCurrency(order.total_amount, order.currency)}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: t('order.paymentMethod'),
      className: 'hidden md:table-cell',
      cell: (order) =>
        order.payment_method ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
            {t(`paymentMethod.${order.payment_method}`)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: 'paymentStatus',
      header: t('order.paymentStatus'),
      className: 'hidden md:table-cell',
      sortable: true,
      sortKey: 'payment_status',
      cell: (order) => <PaymentBadge status={order.payment_status} />,
    },
    {
      key: 'status',
      header: t('order.status'),
      sortable: true,
      sortKey: 'status',
      cell: (order) => <StatusBadge status={order.status} />,
    },
    {
      key: 'date',
      header: t('order.date'),
      align: 'right',
      className: 'hidden lg:table-cell',
      sortable: true,
      sortKey: 'created_at',
      cell: (order) => (
        <>
          <p className="text-xs font-medium">{formatDateTime(order.created_at, lang)}</p>
          <p className="text-[10px] text-muted-foreground">
            {order.handled_by || t('placedVia.manual')}
          </p>
        </>
      ),
    },
    {
      key: 'chevron',
      header: '',
      className: 'w-8 px-2',
      cell: () => (
        <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      ),
    },
  ];

  const fetcher = useCallback(
    async (params: {
      page: number;
      limit: number;
      sort?: string;
      order?: 'asc' | 'desc';
      q?: string;
    }): Promise<OrderTableResult> => {
      const res = await orderApi.list({
        status,
        q: params.q,
        page: params.page,
        limit: params.limit,
        sort: params.sort,
        order: params.order,
      });
      return { rows: res.orders, total: res.total, counts: res.counts };
    },
    [status],
  );

  const statusFilters = STATUS_FILTERS.map((f) => ({ key: f.key, label: t(f.label) }));

  return (
    <DataTable<Order, OrderTableResult>
      columns={columns}
      fetcher={fetcher}
      onResult={(res) => setCounts(res.counts)}
      rowKey={(order) => order.id}
      onRowClick={onOpenOrder}
      searchPlaceholder={t('order.searchPlaceholder')}
      refreshKey={`${refreshKey}-${status}-${reloadToken}`}
      toolbar={
        <div className="flex rounded-lg border border-border bg-card p-0.5">
          {statusFilters.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatus(tab.key);
                setReloadToken((k) => k + 1);
              }}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors',
                status === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
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
                {counts[tab.key] ?? 0}
              </span>
            </button>
          ))}
        </div>
      }
      headerRight={
        <Button size="lg" onClick={onNewInvoice} className="font-hand">
          <Plus className="size-4" />
          {t('order.newInvoiceBtn')}
        </Button>
      }
      emptyState={
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
            <Receipt className="size-6" />
          </div>
          <p className="font-hand text-xl font-bold">{t('order.emptyList')}</p>
          <p className="max-w-xs text-sm text-muted-foreground">{t('order.emptyListHint')}</p>
          <Button onClick={onNewInvoice} className="mt-2 font-hand">
            {t('order.newInvoiceBtn')}
          </Button>
        </div>
      }
    />
  );
}
