import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Menu } from '@base-ui/react/menu';
import {
  BarChart3,
  FileText,
  ShoppingCart,
  Package,
  Users,
  UserCog,
  Settings,
  User,
  MoreVertical,
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
    ],
  },
  {
    labelKey: 'sidebar.sales',
    items: [
      { labelKey: 'sidebar.order', path: 'order', icon: ShoppingCart },
      { labelKey: 'sidebar.product', path: 'product', icon: Package },
      { labelKey: 'sidebar.customer', path: 'customer', icon: Users },
      { labelKey: 'sidebar.team', path: 'team', icon: UserCog },
    ],
  },
];

const bottomItems: SidebarItem[] = [
  { labelKey: 'sidebar.setting', path: 'setting', icon: Settings },
];

export default function AppSidebar() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'bg-muted text-foreground'
        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
    );

  const sectionLabelClass = 'px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground';

  return (
    <aside className="flex h-full w-60 flex-col rounded-xl bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4">
        <div className="flex flex-col">
          <span className="text-lg font-bold leading-tight">ASPC</span>
          <span className="text-[10px] leading-tight text-muted-foreground">
            Automation Selling Platform
          </span>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.labelKey} className="mb-4">
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

      {/* Bottom items */}
      <div className="px-3 py-3">
        <div className="space-y-0.5">
          {bottomItems.map((item) => (
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

        {/* User info + menu */}
        <div className="mt-3 flex items-center gap-3 pt-3">
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
          <Menu.Root>
            <Menu.Trigger className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground outline-none">
              <MoreVertical className="size-4" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner className="outline-none" sideOffset={4}>
                <Menu.Popup className="min-w-40 origin-[var(--transform-origin)] rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-lg outline-none">
                  <Menu.Item
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted hover:text-foreground outline-none"
                    onClick={() => navigate(`/${lang}/profile`)}
                  >
                    <User className="size-4" />
                    {t('sidebar.profile')}
                  </Menu.Item>
                  <Menu.Item
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-destructive transition-colors hover:bg-destructive/10 outline-none"
                    onClick={logout}
                  >
                    <span className="flex size-4 items-center justify-center" />
                    {t('dashboard.signOut')}
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>
      </div>
    </aside>
  );
}
