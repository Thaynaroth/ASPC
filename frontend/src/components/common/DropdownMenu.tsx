import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type TriggerRenderProps = { open: boolean; toggle: () => void };
type ChildrenRenderProps = { close: () => void };

export default function DropdownMenu({
  trigger,
  children,
  align = 'start',
  side = 'bottom',
  menuClassName,
}: {
  trigger: (props: TriggerRenderProps) => ReactNode;
  children: (props: ChildrenRenderProps) => ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom';
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const alignClass =
    align === 'start' ? 'left-0' : align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2';
  const sideClass = side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1';

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          className={cn(
            'absolute z-50',
            alignClass,
            sideClass,
            menuClassName,
          )}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}
