import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';
import { applyTheme } from '@/hooks/use-theme';
import {
  settingsApi,
  type AppLanguage,
  type AppSettings,
  type AppSettingsPatch,
  type AppTheme,
  type PrimaryCurrency,
} from '@/services/settings';
import { getErrorMessage } from '@/services/api';
import { Switch } from '@/components/common/Switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ArrowLeftRight,
  Bell,
  Check,
  ChevronRight,
  Coins,
  CreditCard,
  Languages,
  Loader2,
  Moon,
  Package,
  Sun,
} from 'lucide-react';

type View = 'language' | 'theme' | 'notifications' | 'currency' | 'exchange';
type NotifyKey = 'notify_new_order' | 'notify_low_stock' | 'notify_payment_done';

/* ─── tiny flag / symbol tiles ─────────────────────────── */

function FlagUS({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 480" className={className}>
      <rect width="640" height="480" fill="#B22234" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={(i * 480) / 13} width="640" height={480 / 13} fill="#fff" />
      ))}
      <rect width="260" height={(480 * 7) / 13} fill="#3C3B6E" />
    </svg>
  );
}

function FlagKH({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 480" className={className}>
      <rect width="640" height="480" fill="#032EA1" />
      <rect y="160" width="640" height="160" fill="#E00025" />
    </svg>
  );
}

function SymbolTile({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary ring-1 ring-primary/20">
      {children}
    </span>
  );
}

/* ─── building blocks ──────────────────────────────────── */

function SettingRow({
  icon,
  iconClass,
  label,
  hint,
  value,
  trailing,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  hint?: string;
  value?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex w-full items-center gap-3 px-4 py-3 text-left">
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg ring-1',
          iconClass,
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{label}</span>
        {hint && <span className="block truncate text-xs text-muted-foreground/70">{hint}</span>}
      </span>
      {value && <span className="shrink-0 text-sm text-muted-foreground">{value}</span>}
      {trailing}
    </div>
  );
}

function OptionRow({
  leading,
  label,
  hint,
  selected,
  onClick,
}: {
  leading?: ReactNode;
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors outline-none hover:bg-muted/40 focus-visible:bg-muted/40"
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label}</span>
        {hint && <span className="block truncate text-xs text-muted-foreground/70">{hint}</span>}
      </span>
      {selected ? (
        <Check className="ink-tick size-4 shrink-0 text-primary" />
      ) : (
        <span className="size-4 shrink-0" />
      )}
    </button>
  );
}

function OptionCard({ children }: { children: ReactNode[] }) {
  return (
    <div className="overflow-hidden rounded-xl border-2 border-dashed border-border bg-card shadow-sm">
      {children.map((child, i) => (
        <div key={i}>
          {i > 0 && <div className="mx-4 h-px bg-border/60" />}
          {child}
        </div>
      ))}
    </div>
  );
}

function DetailPanel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="font-hand text-2xl font-bold tracking-tight">{title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/* ─── page ─────────────────────────────────────────────── */

const TILE = {
  sky: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400',
  amber: 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400',
  rose: 'bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400',
  violet: 'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400',
} as const;

const formatRate = (rate: number) => rate.toLocaleString('en-US');

export default function SettingPage() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [view, setView] = useState<View>('language');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [savedTick, setSavedTick] = useState(0);

  const [rateInput, setRateInput] = useState('');
  const [rateError, setRateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    settingsApi
      .get()
      .then((s) => {
        if (cancelled) return;
        setSettings(s);
        applyTheme(s.theme);
        if (s.language !== language) setLanguage(s.language);
      })
      .catch((err) => {
        if (!cancelled) void getErrorMessage(err).then(setError);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!savedTick) return;
    setShowSaved(true);
    const id = setTimeout(() => setShowSaved(false), 1800);
    return () => clearTimeout(id);
  }, [savedTick]);

  const save = async (patch: AppSettingsPatch) => {
    setSaving(true);
    setError(null);
    try {
      const next = await settingsApi.update(patch);
      setSettings(next);
      setSavedTick((n) => n + 1);
      if (patch.theme) applyTheme(next.theme);
      if (patch.language && next.language !== language) setLanguage(next.language);
    } catch (err) {
      setError(await getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleNotify = (key: NotifyKey, value: boolean) => void save({ [key]: value });

  const openExchange = () => {
    if (settings) setRateInput(String(settings.exchange_rate));
    setRateError(null);
    setView('exchange');
  };

  const saveRate = async () => {
    const val = Number(rateInput);
    if (!Number.isFinite(val) || val <= 0) {
      setRateError(t('setting.invalidRate'));
      return;
    }
    setRateError(null);
    await save({ exchange_rate: val });
  };

  if (!settings) {
    return (
      <div className="px-5 py-5">
        <div className="h-9 w-40 animate-pulse rounded-lg bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-5 flex gap-5">
          <div className="w-72 space-y-3">
            <div className="h-52 animate-pulse rounded-xl border-2 border-dashed border-border bg-card" />
          </div>
          <div className="h-64 flex-1 animate-pulse rounded-xl border-2 border-dashed border-border bg-card" />
        </div>
      </div>
    );
  }

  const menu: { section: string; items: { view: View; label: string; icon: ReactNode; iconClass: string }[] }[] = [
    {
      section: t('setting.groupGeneral'),
      items: [
        { view: 'language', label: t('setting.language'), icon: <Languages className="size-4" />, iconClass: TILE.sky },
        { view: 'theme', label: t('setting.theme'), icon: <Sun className="size-4" />, iconClass: TILE.amber },
      ],
    },
    {
      section: t('setting.groupNotifications'),
      items: [
        { view: 'notifications', label: t('setting.notifications'), icon: <Bell className="size-4" />, iconClass: TILE.rose },
      ],
    },
    {
      section: t('setting.groupShop'),
      items: [
        { view: 'currency', label: t('setting.primaryCurrency'), icon: <Coins className="size-4" />, iconClass: TILE.amber },
        { view: 'exchange', label: t('setting.exchangeRate'), icon: <ArrowLeftRight className="size-4" />, iconClass: TILE.sky },
      ],
    },
  ];

  const languageValue =
    settings.language === 'km' ? t('languageSwitcher.khmer') : t('languageSwitcher.english');
  const themeValue = settings.theme === 'dark' ? t('setting.dark') : t('setting.light');
  const currencyValue =
    settings.currency === 'USD'
      ? `${t('setting.usDollar')} ($)`
      : `${t('setting.riel')} (៛)`;
  const notifyCount = ['notify_new_order', 'notify_low_stock', 'notify_payment_done'].filter(
    (k) => settings[k as NotifyKey],
  ).length;

  return (
    <div className="px-5 py-5">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-hand text-3xl font-bold tracking-tight">{t('setting.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('setting.subtitle')}</p>
        </div>
        {showSaved && (
          <span className="ink-tick flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 ring-1 ring-emerald-500/25 dark:text-emerald-400">
            <Check className="size-3" />
            {t('setting.saved')}
          </span>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border-2 border-dashed border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-5 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)_18rem] lg:items-start lg:gap-6">
        {/* ── left menu (iPad-style sidebar) ────────────── */}
        <nav className="w-full shrink-0 space-y-3 lg:w-72">
          {menu.map((section) => (
            <div
              key={section.section}
              className="rounded-xl border-2 border-dashed border-border bg-card p-2 shadow-sm"
            >
              <div className="px-2 pt-1 pb-1.5 text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase">
                {section.section}
              </div>
              <div className="flex gap-1 overflow-x-auto scrollbar-none lg:flex-col lg:overflow-visible">
                {section.items.map((item) => {
                  const active = view === item.view;
                  return (
                    <button
                      key={item.view}
                      onClick={() => {
                        if (item.view === 'exchange') openExchange();
                        else setView(item.view);
                      }}
                      className={cn(
                        'group relative flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors outline-none lg:w-full',
                        active
                          ? 'bg-primary/10 text-foreground'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-lg ring-1',
                          item.iconClass,
                        )}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                      {item.view === 'notifications' && (
                        <span className="ml-auto hidden rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground lg:block">
                          {notifyCount}/3
                        </span>
                      )}
                      {item.view === 'currency' && (
                        <span className="ml-auto hidden text-xs text-muted-foreground/70 lg:block">
                          {settings.currency}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── right detail panel ─────────────────────────── */}
        <div className="min-w-0">
          {view === 'language' && (
            <DetailPanel title={t('setting.languageTitle')} subtitle={t('setting.languageSubtitle')}>
              <OptionCard>
                <OptionRow
                  leading={<FlagUS className="size-6 shrink-0 rounded-sm" />}
                  label={t('languageSwitcher.english')}
                  selected={settings.language === 'en'}
                  onClick={() => void save({ language: 'en' as AppLanguage })}
                />
                <OptionRow
                  leading={<FlagKH className="size-6 shrink-0 rounded-sm" />}
                  label={t('languageSwitcher.khmer')}
                  selected={settings.language === 'km'}
                  onClick={() => void save({ language: 'km' as AppLanguage })}
                />
              </OptionCard>
            </DetailPanel>
          )}

          {view === 'theme' && (
            <DetailPanel title={t('setting.themeTitle')} subtitle={t('setting.themeSubtitle')}>
              <OptionCard>
                <OptionRow
                  leading={<Sun className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />}
                  label={t('setting.light')}
                  selected={settings.theme === 'light'}
                  onClick={() => void save({ theme: 'light' as AppTheme })}
                />
                <OptionRow
                  leading={<Moon className="size-4 shrink-0 text-violet-600 dark:text-violet-400" />}
                  label={t('setting.dark')}
                  selected={settings.theme === 'dark'}
                  onClick={() => void save({ theme: 'dark' as AppTheme })}
                />
              </OptionCard>
            </DetailPanel>
          )}

          {view === 'notifications' && (
            <DetailPanel
              title={t('setting.notificationsTitle')}
              subtitle={t('setting.notificationsSubtitle')}
            >
              <OptionCard>
                <SettingRow
                  icon={<Bell className="size-4" />}
                  iconClass={TILE.rose}
                  label={t('setting.notifyNewOrder')}
                  hint={t('setting.notifyNewOrderHint')}
                  trailing={
                    <Switch
                      checked={settings.notify_new_order}
                      onChange={(v) => toggleNotify('notify_new_order', v)}
                      aria-label={t('setting.notifyNewOrder')}
                    />
                  }
                />
                <SettingRow
                  icon={<Package className="size-4" />}
                  iconClass={TILE.violet}
                  label={t('setting.notifyLowStock')}
                  hint={t('setting.notifyLowStockHint')}
                  trailing={
                    <Switch
                      checked={settings.notify_low_stock}
                      onChange={(v) => toggleNotify('notify_low_stock', v)}
                      aria-label={t('setting.notifyLowStock')}
                    />
                  }
                />
                <SettingRow
                  icon={<CreditCard className="size-4" />}
                  iconClass={TILE.emerald}
                  label={t('setting.notifyPaymentDone')}
                  hint={t('setting.notifyPaymentDoneHint')}
                  trailing={
                    <Switch
                      checked={settings.notify_payment_done}
                      onChange={(v) => toggleNotify('notify_payment_done', v)}
                      aria-label={t('setting.notifyPaymentDone')}
                    />
                  }
                />
              </OptionCard>
            </DetailPanel>
          )}

          {view === 'currency' && (
            <DetailPanel
              title={t('setting.primaryCurrencyTitle')}
              subtitle={t('setting.primaryCurrencySubtitle')}
            >
              <OptionCard>
                <OptionRow
                  leading={<SymbolTile>$</SymbolTile>}
                  label={t('setting.usDollar')}
                  hint="USD — $"
                  selected={settings.currency === 'USD'}
                  onClick={() => void save({ currency: 'USD' as PrimaryCurrency })}
                />
                <OptionRow
                  leading={<SymbolTile>៛</SymbolTile>}
                  label={t('setting.riel')}
                  hint="KHR — ៛"
                  selected={settings.currency === 'KHR'}
                  onClick={() => void save({ currency: 'KHR' as PrimaryCurrency })}
                />
              </OptionCard>
            </DetailPanel>
          )}

          {view === 'exchange' && (
            <DetailPanel
              title={t('setting.exchangeRateTitle')}
              subtitle={t('setting.exchangeRateSubtitle')}
            >
              <div className="rounded-xl border-2 border-dashed border-border bg-card p-4 shadow-sm">
                <label className="block">
                  <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {t('setting.exchangeRateInputLabel')}
                  </span>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="shrink-0 text-sm font-semibold tabular-nums">1 USD =</span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      inputMode="decimal"
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void saveRate();
                      }}
                      className="h-10 w-full min-w-0 rounded-lg border-2 border-dashed border-input bg-transparent px-3 text-right text-sm font-semibold tabular-nums outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/50"
                    />
                    <span className="shrink-0 text-sm font-semibold text-muted-foreground">KHR</span>
                  </div>
                </label>
                <p className="mt-2 text-xs text-muted-foreground/70">{t('setting.exchangeRateHint')}</p>
                {rateError && <p className="mt-1 text-xs text-destructive">{rateError}</p>}
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setRateInput(String(settings.exchange_rate))}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={() => void saveRate()} disabled={saving}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                    {t('common.save')}
                  </Button>
                </div>
              </div>
            </DetailPanel>
          )}

          {/* hint for current selections under the detail panel */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
              {t('setting.language')}: {languageValue}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
              {t('setting.theme')}: {themeValue}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
              {t('setting.primaryCurrency')}: {currencyValue}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
              1 USD = {formatRate(settings.exchange_rate)} KHR
            </span>
            <span className="flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
              <ChevronRight className="size-3" />
              {t('setting.notifications')}: {notifyCount}/3
            </span>
          </div>
        </div>

        {/* spacer — keeps the detail panel from taking the full width */}
        <div className="hidden lg:block" />
      </div>
    </div>
  );
}