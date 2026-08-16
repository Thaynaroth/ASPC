import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Printer, CheckCheck, Ban, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusBadge, PaymentBadge } from '@/components/common/StatusBadge';
import { orderApi, type Order, type OrderStatus } from '@/services/orders';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { getErrorMessage } from '@/services/api';

// fulfillment flow; payment_pending is resolved via "mark paid"
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'delivered',
};

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

  useEffect(() => {
    setConfirmCancel(false);
    setCancelReason('');
    setError(null);
  }, [order?.id]);

  useEffect(() => {
    if (!order) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [order, onClose]);

  if (!order) return null;

  const next = NEXT_STATUS[order.status];
  const canMarkPaid = !order.paid_at && order.status !== 'cancelled';
  const canCancel = order.status !== 'cancelled' && order.status !== 'delivered';

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

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="print-area relative flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-lg">
        {/* header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="font-hand text-xl font-bold tracking-tight">{t('order.invoice')}</h3>
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-hand text-sm font-bold">
              {order.number}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-4 mt-4 rounded-lg border-2 border-dashed border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* ── paper invoice preview ────────────── */}
          <div className="p-4">
            <div className="paper-ruled relative rounded-xl border-2 border-dashed bg-card px-5 py-4 shadow-sm">
              {order.status === 'cancelled' && (
                <div className="ink-stamp pointer-events-none absolute top-16 right-4 z-10 rounded-md border-4 px-3 py-1 font-hand text-2xl font-bold tracking-widest text-rose-600/70 uppercase select-none">
                  {t('order.stampCancelled')}
                </div>
              )}
              {order.payment_status === 'paid' && order.status !== 'cancelled' && (
                <div className="ink-stamp pointer-events-none absolute top-16 right-4 z-10 rounded-md border-4 px-3 py-1 font-hand text-2xl font-bold tracking-widest text-emerald-600/80 uppercase select-none">
                  {t('order.stampPaid')}
                </div>
              )}

              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-hand text-2xl leading-tight font-bold">{t('order.invoice')}</h4>
                  <p className="text-sm font-semibold">{order.shop_name}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{formatDateTime(order.created_at, lang)}</p>
                  <p className="mt-0.5">
                    {t('order.handledBy')}:{' '}
                    <span className="font-medium text-foreground">
                      {order.handled_by || '—'}
                    </span>
                  </p>
                </div>
              </div>

              {(order.customer_name || order.customer_phone || order.customer_address) && (
                <div className="mt-3 space-y-0.5 rounded-lg border border-dashed px-3 py-2 text-xs">
                  {order.customer_name && (
                    <p>
                      <span className="font-semibold">{t('order.customerName')}:</span>{' '}
                      {order.customer_name}
                    </p>
                  )}
                  {order.customer_phone && (
                    <p>
                      <span className="font-semibold">{t('order.phone')}:</span>{' '}
                      {order.customer_phone}
                    </p>
                  )}
                  {order.customer_address && (
                    <p>
                      <span className="font-semibold">{t('order.address')}:</span>{' '}
                      {order.customer_address}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-3">
                <div className="flex items-center gap-3 border-b border-dashed pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  <span className="w-5" />
                  <span className="flex-1">{t('order.item')}</span>
                  <span className="w-10 text-right">{t('order.qty')}</span>
                  <span className="w-20 text-right">{t('order.amount')}</span>
                </div>
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 border-b border-dashed/70 py-1.5 text-sm"
                  >
                    <span className="flex w-5 justify-center">
                      <span className="ink-tick text-emerald-500">✓</span>
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                    <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                      ×{item.quantity}
                    </span>
                    <span className="w-20 text-right font-semibold tabular-nums">
                      {formatCurrency(item.subtotal, order.currency)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('order.subtotal')}</span>
                  <span className="tabular-nums">{formatCurrency(order.subtotal, order.currency)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>{t('order.discount')}</span>
                    <span className="tabular-nums">
                      −{formatCurrency(order.discount_amount, order.currency)}
                    </span>
                  </div>
                )}
                {order.delivery_fee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('order.deliveryFee')}</span>
                    <span className="tabular-nums">{formatCurrency(order.delivery_fee, order.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t-2 border-dashed pt-1.5">
                  <span className="font-hand text-lg font-bold">{t('order.total')}</span>
                  <span className="border-b-4 border-double px-1 text-lg font-extrabold tabular-nums">
                    {formatCurrency(order.total_amount, order.currency)}
                  </span>
                </div>
              </div>

              {order.note && (
                <p className="mt-3 border-t border-dashed pt-2 text-xs italic text-muted-foreground">
                  {order.note}
                </p>
              )}

              {order.status === 'cancelled' && order.cancel_reason && (
                <p className="mt-3 rounded-lg border border-dashed border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
                  <span className="font-semibold">{t('order.cancelReasonLabel')}:</span>{' '}
                  {order.cancel_reason}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <StatusBadge status={order.status} />
                <PaymentBadge status={order.payment_status} />
                {order.payment_method && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                    {t(`paymentMethod.${order.payment_method}`)}
                  </span>
                )}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                  {t(`placedVia.${order.placed_via}`)}
                </span>
              </div>
            </div>
          </div>

          {/* ── actions ──────────────────────────── */}
          <div className="space-y-2 px-4 pb-6">
            {next && (
              <Button
                className="w-full font-hand text-base"
                size="lg"
                disabled={busy !== null}
                onClick={() =>
                  run('next', () => orderApi.updateStatus(order.id, { status: next! }))
                }
              >
                {busy === 'next' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCheck className="size-4" />
                )}
                {t(`order.advance${next[0].toUpperCase()}${next.slice(1)}`)}
              </Button>
            )}

            {canMarkPaid && (
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                disabled={busy !== null}
                onClick={() => run('pay', () => orderApi.markPaid(order.id))}
              >
                {busy === 'pay' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCheck className="size-4" />
                )}
                {t('order.markPaid')}
              </Button>
            )}

            {canCancel &&
              (confirmCancel ? (
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
              ) : (
                <Button
                  variant="ghost"
                  className={cn('w-full text-destructive hover:bg-destructive/10')}
                  onClick={() => setConfirmCancel(true)}
                >
                  <Ban className="size-4" />
                  {t('order.cancelOrder')}
                </Button>
              ))}

            <Button variant="ghost" className="w-full" onClick={() => window.print()}>
              <Printer className="size-4" />
              {t('order.print')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
