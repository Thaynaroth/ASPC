import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { OrderStatus, PaymentStatus } from '@/services/orders';

const statusStyles: Record<OrderStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400',
  confirmed: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400',
  payment_pending: 'bg-orange-500/10 text-orange-600 ring-orange-500/20 dark:text-orange-400',
  paid: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400',
  preparing: 'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400',
  delivered: 'bg-teal-500/10 text-teal-600 ring-teal-500/20 dark:text-teal-400',
  cancelled: 'bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400',
};

export function StatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1',
        statusStyles[status] ?? statusStyles.pending,
        className,
      )}
    >
      {t(`orderStatus.${status}`)}
    </span>
  );
}

const paymentStyles: Record<PaymentStatus, string> = {
  unpaid: 'bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400',
  pending: 'bg-orange-500/10 text-orange-600 ring-orange-500/20 dark:text-orange-400',
  paid: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400',
  failed: 'bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400',
};

export function PaymentBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1',
        paymentStyles[status],
        className,
      )}
    >
      {t(`paymentStatus.${status}`)}
    </span>
  );
}
