import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import InvoiceSheet from '@/components/order/InvoiceSheet';
import OrderList from '@/components/order/OrderList';
import OrderDetailPanel from '@/components/order/OrderDetailPanel';
import SideDrawer from '@/components/order/SideDrawer';
import type { Order } from '@/services/orders';

export default function OrderPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const [selected, setSelected] = useState<Order | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex h-full flex-col">
      {/* page header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <h1 className="font-hand text-3xl leading-snug font-bold tracking-tight">
          {t('order.title')}
        </h1>
      </div>

      <OrderList
        lang={lang ?? 'en'}
        refreshKey={refreshKey}
        onOpenOrder={setSelected}
        onNewInvoice={() => setInvoiceOpen(true)}
      />

      <OrderDetailPanel
        order={selected}
        lang={lang ?? 'en'}
        onClose={() => setSelected(null)}
        onChanged={(updated) => {
          setSelected(updated);
          setRefreshKey((k) => k + 1);
        }}
      />

      <SideDrawer
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        width="xl"
        title={
          <h3 className="font-hand text-xl font-bold tracking-tight">
            {t('order.newInvoiceBtn')}
          </h3>
        }
      >
        <InvoiceSheet
          lang={lang ?? 'en'}
          open={invoiceOpen}
          onPlaced={() => setRefreshKey((k) => k + 1)}
        />
      </SideDrawer>
    </div>
  );
}
