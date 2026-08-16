import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import Logo from '@/components/common/Logo';
import { Menu } from '@base-ui/react/menu';
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
  Settings,
  User,
  LogOut,
  ChevronUp,
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
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <Logo className="scale-90 opacity-90" />
        <div className="flex flex-col">
          <span className="font-hand text-xl leading-tight font-bold tracking-tight">ASPC</span>
          <span className="text-[10px] leading-tight font-medium text-muted-foreground/70">
            Automation Selling Platform
          </span>
        </div>
      </div>

      {/* Current shop (non-superadmin users) */}
      {shop && (
        <div className="flex items-center gap-2.5 px-5 pb-2">
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
            {index > 0 && <div className="my-4 h-px bg-border/50" />}
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

      {/* User profile */}
      <div className="px-3 pt-2 pb-3">
        <div className="mb-2 h-px bg-border/50" />
        <Menu.Root>
          <Menu.Trigger className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none transition-colors hover:bg-muted/50">
            <div className="relative shrink-0">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary ring-1 ring-primary/20">
                {(user?.full_name || user?.email || '?')[0].toUpperCase()}
              </div>
              <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">
                {user?.full_name || user?.email}
              </p>
              <p className="truncate text-[11px] leading-tight text-muted-foreground/70">
                {user?.email}
              </p>
            </div>
            <ChevronUp className="size-4 shrink-0 text-muted-foreground/60" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner className="outline-none" side="top" sideOffset={8}>
              <Menu.Popup className="min-w-56 origin-[var(--transform-origin)] rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg outline-none">
                <div className="flex items-center gap-3 rounded-md px-2 py-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary ring-1 ring-primary/20">
                    {(user?.full_name || user?.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {user?.full_name || '—'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground/70">
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
    </aside>
  );
}
