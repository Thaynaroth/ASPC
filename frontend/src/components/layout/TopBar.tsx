import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/common/Logo';
import { Menu } from '@base-ui/react/menu';
import { cn } from '@/lib/utils';
import { Bell, LogOut, Plus, Settings, User, X } from 'lucide-react';

export default function TopBar() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    if (!notifOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [notifOpen]);

  const iconBtnClass =
    'relative flex cursor-pointer items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

  return (
    <header className="mb-5 flex h-[60px] shrink-0 items-center justify-between gap-3 px-4 sm:px-5">
      {/* Left — logo */}
      <div className="flex items-center gap-2.5">
        <Logo className="scale-90 opacity-90" />
        <div className="flex flex-col">
          <span className="font-hand text-lg leading-tight font-bold tracking-tight">ASPC</span>
          <span className="hidden text-[10px] leading-tight font-medium text-muted-foreground/70 sm:block">
            Automation Selling Platform
          </span>
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1.5">
        {/* Create order */}
        <button
          onClick={() => navigate(`/${lang}/order?new=1`)}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">{t('order.newInvoiceBtn')}</span>
        </button>

        {/* Notifications */}
        <button
          onClick={() => setNotifOpen(true)}
          aria-label={t('topbar.notifications')}
          className={iconBtnClass}
        >
          <Bell className="size-5" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-rose-500 ring-2 ring-background" />
        </button>

        {/* User avatar */}
        <Menu.Root>
          <Menu.Trigger className="flex cursor-pointer items-center justify-center rounded-full p-1 outline-none transition-colors hover:bg-muted">
            <div className="relative shrink-0">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary ring-1 ring-primary/20">
                {(user?.full_name || user?.email || '?')[0].toUpperCase()}
              </div>
              <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner className="outline-none" side="bottom" align="end" sideOffset={8}>
              <Menu.Popup className="min-w-48 origin-[var(--transform-origin)] rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg outline-none">
                <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary ring-1 ring-primary/20">
                    {(user?.full_name || user?.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="max-w-36 truncate text-sm font-semibold">
                      {user?.full_name || '—'}
                    </p>
                    <p className="max-w-36 truncate text-xs text-muted-foreground/70">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <Menu.Separator className="my-1 h-px bg-border/60" />
                <Menu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors outline-none hover:bg-muted hover:text-foreground"
                  onClick={() => navigate(`/${lang}/profile`)}
                >
                  <User className="size-4" />
                  {t('sidebar.profile')}
                </Menu.Item>
                <Menu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors outline-none hover:bg-muted hover:text-foreground"
                  onClick={() => navigate(`/${lang}/setting`)}
                >
                  <Settings className="size-4" />
                  {t('sidebar.setting')}
                </Menu.Item>
                <Menu.Separator className="my-1 h-px bg-border/60" />
                <Menu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-destructive transition-colors outline-none hover:bg-destructive/10"
                  onClick={logout}
                >
                  <LogOut className="size-4" />
                  {t('dashboard.signOut')}
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>

      {/* Notifications panel — right slide-in */}
      <div
        className={cn('fixed inset-0 z-40 flex justify-end', !notifOpen && 'pointer-events-none')}
        aria-hidden={!notifOpen}
      >
        <div
          onClick={() => setNotifOpen(false)}
          className={cn(
            'absolute inset-0 bg-foreground/20 backdrop-blur-[2px] transition-opacity duration-300 ease-out',
            notifOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'z-10 flex h-full w-full max-w-sm flex-col border-l border-border bg-background shadow-lg transition-transform duration-300 ease-out',
            notifOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-primary" />
              <h2 className="font-hand text-lg font-bold tracking-tight">
                {t('topbar.notifications')}
              </h2>
            </div>
            <button
              onClick={() => setNotifOpen(false)}
              aria-label={t('common.close')}
              className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-border bg-background px-6 py-10 text-center shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
                <Bell className="size-6" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t('topbar.noNotifications')}</p>
                <p className="mt-0.5 text-xs text-muted-foreground/70">
                  {t('topbar.noNotificationsHint')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}