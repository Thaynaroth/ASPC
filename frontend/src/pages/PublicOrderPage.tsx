import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Share2, Send, Copy, Check, Printer } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import DropdownMenu from '@/components/common/DropdownMenu';
import { orderApi, type Order } from '@/services/orders';
import { getErrorMessage } from '@/services/api';
import { cn } from '@/lib/utils';
import OrderInvoice from '@/components/order/OrderInvoice';

export default function PublicOrderPage() {
  const { shopId, orderId } = useParams<{ shopId: string; orderId: string }>();
  const { t, i18n } = useTranslation();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Prevent search-engine indexing of shared order links.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  useEffect(() => {
    if (!shopId || !orderId) return;
    let active = true;
    (async () => {
      try {
        const res = await orderApi.getPublic(shopId, orderId);
        if (!active) return;
        setOrder(res.order);
        document.title = `${res.order.number} · ${res.order.shop_name}`;
      } catch (err) {
        if (active) setError(await getErrorMessage(err));
      }
    })();
    return () => {
      active = false;
    };
  }, [shopId, orderId]);

  const shareUrl = order ? `${window.location.origin}/${order.shop_id}/${order.id}` : '';

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

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <div className="rounded-xl border-2 border-dashed bg-card px-6 py-8 text-center shadow-sm">
          <p className="font-hand text-2xl font-bold">{t('order.notFound')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="font-hand text-xl font-bold tracking-tight">{order.shop_name}</span>
          <div className="flex items-center gap-2">
            <DropdownMenu
              align="end"
              side="bottom"
              menuClassName="min-w-44 rounded-lg border-2 border-dashed bg-card p-1 shadow-md"
              trigger={({ toggle, open }) => (
                <button
                  type="button"
                  onClick={toggle}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5', open && 'bg-muted')}
                >
                  {copied ? (
                    <Check className="size-4 text-emerald-600" />
                  ) : (
                    <Share2 className="size-4" />
                  )}
                  {copied ? t('order.linkCopied') : t('order.share')}
                  <Copy className="size-3.5 opacity-70" />
                </button>
              )}
            >
              {({ close }) => (
                <>
                  <button type="button" className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={() => { shareTelegram(); close(); }}>
                    <Send className="size-4 text-sky-600" />
                    {t('order.shareTelegram')}
                  </button>
                  <button type="button" className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={() => { copyLink(); close(); }}>
                    <Copy className="size-4" />
                    {t('order.copyLink')}
                  </button>
                </>
              )}
            </DropdownMenu>

            <Button variant="default" size="sm" className="gap-1.5" onClick={() => window.print()}>
              <Printer className="size-4" />
              {t('order.print')}
            </Button>
          </div>
        </div>

        <OrderInvoice order={order} lang={i18n.language} />

        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t('order.publicShareHint')}
        </p>
      </div>
    </div>
  );
}
