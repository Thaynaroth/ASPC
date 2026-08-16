import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Receipt, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';
import InvoiceSheet from '@/components/order/InvoiceSheet';
import OrderList from '@/components/order/OrderList';
import OrderDetailPanel from '@/components/order/OrderDetailPanel';
import type { Order } from '@/services/orders';

type Tab = 'invoice' | 'list';

export default function OrderPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const [tab, setTab] = useState<Tab>('invoice');
  const [selected, setSelected] = useState<Order | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const switchTab = (next: Tab) => {
    if (next === 'list') setRefreshKey((k) => k + 1);
    setTab(next);
  };

  return (
    <div className="flex h-full flex-col">
      {/* page header + tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <h1 className="font-hand text-3xl leading-snug font-bold tracking-tight">
          {t('order.title')}
        </h1>
        <div className="flex rounded-xl border border-border bg-card p-1">
          <button
            onClick={() => switchTab('invoice')}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors',
              tab === 'invoice'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Receipt className="size-4" />
            {t('order.newInvoiceTab')}
          </button>
          <button
            onClick={() => switchTab('list')}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors',
              tab === 'list'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <ListOrdered className="size-4" />
            {t('order.listTab')}
          </button>
        </div>
      </div>

      {tab === 'invoice' ? (
        <InvoiceSheet
          lang={lang ?? 'en'}
          onPlaced={() => setRefreshKey((k) => k + 1)}
        />
      ) : (
        <OrderList
          lang={lang ?? 'en'}
          refreshKey={refreshKey}
          onOpenOrder={setSelected}
          onNewInvoice={() => switchTab('invoice')}
        />
      )}

      <OrderDetailPanel
        order={selected}
        lang={lang ?? 'en'}
        onClose={() => setSelected(null)}
        onChanged={(updated) => {
          setSelected(updated);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}
