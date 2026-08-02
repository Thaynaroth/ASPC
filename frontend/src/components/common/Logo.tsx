import { cn } from '@/lib/utils';

export default function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-lg font-extrabold text-primary-foreground',
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-6"
        aria-hidden="true"
      >
        <path d="M12 4 4.5 20h3.1L9 16.5h6l1.4 3.5h3.1L12 4Z" />
        <path d="M10.2 13h3.6L12 8.5 10.2 13Z" />
      </svg>
    </div>
  );
}
