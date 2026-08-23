import { useEffect, useState } from 'react';
import { NavLink, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { orderApi } from '@/services/orders';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  FileText,
  Bot,
  MessageSquare,
  ShoppingCart,
  BadgePercent,
  Package,
  LayoutGrid,
  Users,
  Store,
} from 'lucide-react';

interface SidebarItem {
  labelKey: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarSection {
  labelKey: string;
  items: SidebarItem[];
}

const sections: SidebarSection[] = [
  {
    labelKey: 'sidebar.analytics',
    items: [
      { labelKey: 'sidebar.dashboard', path: 'dashboard', icon: BarChart3 },
      { labelKey: 'sidebar.report', path: 'report', icon: FileText },
      { labelKey: 'sidebar.agent', path: 'agent', icon: Bot },
    ],
  },
  {
    labelKey: 'sidebar.sales',
    items: [
      { labelKey: 'sidebar.chat', path: 'chat', icon: MessageSquare },
      { labelKey: 'sidebar.order', path: 'order', icon: ShoppingCart },
      { labelKey: 'sidebar.promotion', path: 'promotion', icon: BadgePercent },
      { labelKey: 'sidebar.product', path: 'product', icon: Package },
      { labelKey: 'sidebar.category', path: 'category', icon: LayoutGrid },
      { labelKey: 'sidebar.customer', path: 'customer', icon: Users },
    ],
  },
];

const sectionLabelClass =
  'px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60';

export default function AppSidebar() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const { user } = useAuth();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchPendingCount = async () => {
      try {
        const res = await orderApi.list({ status: 'pending', limit: 1 });
        if (!cancelled) setPendingCount(res.counts.pending ?? 0);
      } catch {
        // sidebar badge is non-critical; keep the last known count
      }
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [location.pathname]);

  const shop = user?.shops?.[0];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'text-foreground'
        : 'text-muted-foreground/80 hover:text-foreground',
    );

  return (
    <aside className="flex h-full w-60 flex-col">
      {/* Current shop (non-superadmin users) */}
      {shop && (
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
            <Store className="size-3.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold leading-tight">{shop.name}</p>
            <p className="truncate text-[10px] leading-tight text-muted-foreground/70">
              {shop.role}
            </p>
          </div>
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section, index) => (
          <div key={section.labelKey}>
            {index > 0 && <div className="my-4 h-px" />}
            <div className={sectionLabelClass}>{t(section.labelKey)}</div>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink key={item.path} to={`/${lang}/${item.path}`} className={linkClass}>
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={cn(
                          'size-4 shrink-0 transition-colors',
                          isActive
                            ? 'text-primary'
                            : 'text-muted-foreground/60 group-hover:text-foreground',
                        )}
                      />
                      {t(item.labelKey)}
                      {item.path === 'order' && pendingCount > 0 && (
                        <span className="ml-auto flex min-w-5 items-center justify-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-600 ring-1 ring-amber-500/25 dark:text-amber-400">
                          {pendingCount > 99 ? '99+' : pendingCount}
                        </span>
                      )}
                      {isActive && (
                        <span className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
