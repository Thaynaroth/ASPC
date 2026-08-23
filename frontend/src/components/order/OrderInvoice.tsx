import { useTranslation } from 'react-i18next';
import { StatusBadge, PaymentBadge } from '@/components/common/StatusBadge';
import type { Order } from '@/services/orders';
import { formatCurrency, formatDateTime } from '@/utils/format';

export default function OrderInvoice({
  order,
  lang,
}: {
  order: Order;
  lang: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="paper-ruled print-area relative rounded-xl border-2 border-dashed bg-card px-5 py-4 shadow-sm">
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
            <span className="font-medium text-foreground">{order.handled_by || '—'}</span>
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
        {order.items.map((item, i) => (
          <div
            key={item.id}
            className="flex items-center gap-3 border-b border-dashed/70 py-1.5 text-sm"
          >
            <span className="flex w-5 justify-center">
              <span className="rounded-full bg-primary/10 px-1 text-[10px] font-bold text-primary tabular-nums">
                {i + 1}
              </span>
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
        <div className="flex justify-between pt-1.5">
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
  );
}
