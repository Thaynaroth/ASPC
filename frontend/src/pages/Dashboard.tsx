import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import {
  Bot,
  MessageSquare,
  ShoppingCart,
  Package,
  BadgePercent,
  LayoutGrid,
  Users,
  FileText,
} from 'lucide-react';

const modules = [
  { key: 'chat', icon: MessageSquare, tile: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400' },
  { key: 'agent', icon: Bot, tile: 'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400' },
  { key: 'order', icon: ShoppingCart, tile: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400' },
  { key: 'product', icon: Package, tile: 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400' },
  { key: 'promotion', icon: BadgePercent, tile: 'bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400' },
  { key: 'category', icon: LayoutGrid, tile: 'bg-indigo-500/10 text-indigo-600 ring-indigo-500/20 dark:text-indigo-400' },
  { key: 'customer', icon: Users, tile: 'bg-teal-500/10 text-teal-600 ring-teal-500/20 dark:text-teal-400' },
  { key: 'report', icon: FileText, tile: 'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400' },
];

export default function Dashboard() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const today = new Intl.DateTimeFormat(lang === 'km' ? 'km-KH' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">
            {t('dashboard.welcome')}
            {user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold">{user?.full_name || user?.email}</p>
            <p className="text-xs text-muted-foreground">
              {user?.roles?.join(', ') || '—'}
            </p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground ring-2 ring-white shadow-sm dark:ring-transparent">
            {(user?.full_name || user?.email || '?')[0].toUpperCase()}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {t('dashboard.quickAccess')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <button
              key={module.key}
              onClick={() => navigate(`/${lang}/${module.key}`)}
              className="group flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className={`flex size-11 shrink-0 items-center justify-center rounded-lg ring-1 ${module.tile}`}
              >
                <module.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t(`sidebar.${module.key}`)}</p>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.comingSoon')}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
