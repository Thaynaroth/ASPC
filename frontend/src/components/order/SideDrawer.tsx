import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const WIDTHS = {
  md: 'max-w-md',
  xl: 'max-w-6xl',
} as const;

export default function SideDrawer({
  open,
  onClose,
  title,
  width = 'md',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  width?: keyof typeof WIDTHS;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div className={cn('fixed inset-0 z-40 flex justify-end', !open && 'pointer-events-none')}>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={cn(
          'absolute inset-0 bg-foreground/20 backdrop-blur-[2px] transition-opacity duration-300 ease-out',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'z-10 flex h-full w-full flex-col border-l border-border bg-background shadow-lg transition-transform duration-300 ease-out',
          WIDTHS[width],
          open ? '' : 'translate-x-full',
        )}
      >
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2">{title}</div>
            <button
              onClick={onClose}
              aria-label={t('common.close')}
              className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
