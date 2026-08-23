import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Printer,
  Loader2,
  Share2,
  Send,
  Copy,
  Check,
  ChevronDown,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import DropdownMenu from '@/components/common/DropdownMenu';
import { orderApi, type Order, type OrderStatus } from '@/services/orders';
import { getErrorMessage } from '@/services/api';
import SideDrawer from './SideDrawer';
import OrderInvoice from './OrderInvoice';

// fulfillment flow; payment_pending is resolved via "mark paid"
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'processing',
  processing: 'confirmed',
  confirmed: 'preparing',
  preparing: 'delivered',
};

const triggerClass = 'w-full gap-1.5 font-hand text-base';

const menuClass = 'min-w-44 rounded-lg border-2 border-dashed bg-card p-1 shadow-md';

const itemClass =
  'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-muted';

export default function OrderDetailPanel({
  order,
  lang,
  onClose,
  onChanged,
}: {
  order: Order | null;
  lang: string;
  onClose: () => void;
  onChanged: (order: Order) => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setConfirmCancel(false);
    setCancelReason('');
    setError(null);
    setCopied(false);
  }, [order?.id]);

  const next = order ? NEXT_STATUS[order.status] : null;
  const canMarkPaid = !!order && !order.paid_at && order.status !== 'cancelled';
  const canCancel = !!order && order.status !== 'cancelled' && order.status !== 'delivered';

  const shareUrl = order ? `${window.location.origin}/${order.shop_id}/${order.id}` : '';

  const run = async (id: string, action: () => Promise<{ order: Order }>) => {
    setBusy(id);
    setError(null);
    try {
      const res = await action();
      onChanged(res.order);
    } catch (err) {
      setError(await getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const shareTelegram = () => {
    if (!order) return;
    const text = `${t('order.invoice')} ${order.number} — ${order.shop_name}`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback for browsers without clipboard permissions.
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const markAsOptions: Array<{ id: string; label: string; run: () => void; danger?: boolean }> = [];
  if (order && next) {
    markAsOptions.push({
      id: 'next',
      label: `${t('order.markAs')} ${t(`orderStatus.${next}`)}`,
      run: () => run('next', () => orderApi.updateStatus(order.id, { status: next })),
    });
  }
  if (order && canMarkPaid) {
    markAsOptions.push({
      id: 'pay',
      label: t('order.markAsPaid'),
      run: () => run('pay', () => orderApi.markPaid(order.id)),
    });
  }
  if (order && canCancel) {
    markAsOptions.push({
      id: 'cancel',
      label: t('order.cancelOrder'),
      danger: true,
      run: () => setConfirmCancel(true),
    });
  }

  return (
    <SideDrawer
      open={!!order}
      onClose={onClose}
      width="md"
      title={
        order && (
          <>
            <h3 className="font-hand text-xl font-bold tracking-tight">{t('order.invoice')}</h3>
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-hand text-sm font-bold">
              {order.number}
            </span>
          </>
        )
      }
    >
      {order && (
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-4 mt-4 rounded-lg border-2 border-dashed border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* ── actions (top) ────────────────────── */}
          <div className="space-y-2 px-4 pt-4 pb-2">
            <div className="grid grid-cols-3 gap-2">
              {/* Share */}
              <DropdownMenu
                align="start"
                side="bottom"
                menuClassName={menuClass}
                trigger={({ toggle, open }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), triggerClass, open && 'bg-muted')}
                  >
                    {copied ? (
                      <Check className="size-4 text-emerald-600" />
                    ) : (
                      <Share2 className="size-4" />
                    )}
                    {copied ? t('order.linkCopied') : t('order.share')}
                    <ChevronDown className="size-3.5 opacity-70" />
                  </button>
                )}
              >
                {({ close }) => (
                  <>
                    <button type="button" className={itemClass} onClick={() => { shareTelegram(); close(); }}>
                      <Send className="size-4 text-sky-600" />
                      {t('order.shareTelegram')}
                    </button>
                    <button type="button" className={itemClass} onClick={() => { copyLink(); close(); }}>
                      <Copy className="size-4" />
                      {t('order.copyLink')}
                    </button>
                  </>
                )}
              </DropdownMenu>

              {/* Mark as */}
              <DropdownMenu
                align="center"
                side="bottom"
                menuClassName={menuClass}
                trigger={({ toggle, open }) => (
                  <button
                    type="button"
                    disabled={markAsOptions.length === 0}
                    onClick={toggle}
                    className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), triggerClass, open && 'bg-muted')}
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    {t('order.markAs')}
                    <ChevronDown className="size-3.5 opacity-70" />
                  </button>
                )}
              >
                {({ close }) =>
                  markAsOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={cn(itemClass, opt.danger && 'text-destructive')}
                      onClick={() => { opt.run(); close(); }}
                    >
                      {opt.danger ? <Ban className="size-4" /> : <Check className="size-4" />}
                      {opt.label}
                    </button>
                  ))
                }
              </DropdownMenu>

              {/* Print */}
              <Button variant="default" size="lg" className={triggerClass} onClick={() => window.print()}>
                <Printer className="size-4" />
                {t('order.print')}
              </Button>
            </div>

            {confirmCancel && (
              <div className="rounded-lg border-2 border-dashed border-destructive/40 bg-card p-3">
                <p className="text-sm font-semibold">{t('order.cancelOrder')}</p>
                <input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={t('order.cancelReasonPlaceholder')}
                  className="mt-2 h-8 w-full rounded-md border-2 border-dashed border-input bg-transparent px-2 text-sm outline-none focus:border-ring"
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() =>
                      run('cancel', () =>
                        orderApi.updateStatus(order.id, {
                          status: 'cancelled',
                          cancel_reason: cancelReason || undefined,
                        }),
                      )
                    }
                  >
                    {busy === 'cancel' ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Ban className="size-3.5" />
                    )}
                    {t('common.confirm')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── paper invoice preview ────────────── */}
          <div className="p-4 pt-2">
            <OrderInvoice order={order} lang={lang} />
          </div>
        </div>
      )}
    </SideDrawer>
  );
}
