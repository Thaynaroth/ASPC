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
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

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

export default function AppSidebar() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    );

  const sectionLabelClass = 'px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground';

  return (
    <aside className="flex h-full w-60 flex-col rounded-xl border-2 border-dashed bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <Logo />
        <div className="flex flex-col">
          <span className="font-hand text-xl leading-tight font-bold tracking-tight">ASPC</span>
          <span className="text-[10px] leading-tight font-medium text-muted-foreground">
            Automation Selling Platform
          </span>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section, index) => (
          <div key={section.labelKey}>
            {index > 0 && <div className="my-4 h-px bg-border" />}
            <div className={sectionLabelClass}>{t(section.labelKey)}</div>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={`/${lang}/${item.path}`}
                  className={linkClass}
                >
                  <item.icon className="size-4 shrink-0" />
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Theme toggle */}
      <div className="px-3">
        <button
          onClick={toggleTheme}
          className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {theme === 'dark' ? (
            <Sun className="size-4 shrink-0" />
          ) : (
            <Moon className="size-4 shrink-0" />
          )}
          {t('sidebar.theme')}
        </button>
      </div>

      {/* User menu */}
      <div className="px-3 pt-2 pb-3">
        <div className="h-px bg-border" />
        <Menu.Root>
          <Menu.Trigger className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted outline-none">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {(user?.full_name || user?.email || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user?.full_name || user?.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.roles?.join(', ') || '---'}
              </p>
            </div>
            <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner className="outline-none" side="top" sideOffset={8}>
              <Menu.Popup className="min-w-56 origin-[var(--transform-origin)] rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-lg outline-none">
                <div className="flex items-center gap-3 rounded-md px-2 py-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {(user?.full_name || user?.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {user?.full_name || user?.email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <Menu.Separator className="my-1 h-px bg-border" />
                <Menu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted hover:text-foreground outline-none"
                  onClick={() => navigate(`/${lang}/profile`)}
                >
                  <User className="size-4" />
                  {t('sidebar.profile')}
                </Menu.Item>
                <Menu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted hover:text-foreground outline-none"
                  onClick={() => navigate(`/${lang}/setting`)}
                >
                  <Settings className="size-4" />
                  {t('sidebar.setting')}
                </Menu.Item>
                <Menu.Separator className="my-1 h-px bg-border" />
                <Menu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-destructive transition-colors hover:bg-destructive/10 outline-none"
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
