import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}

export function Switch({ checked, onChange, disabled, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        checked
          ? 'border-primary bg-primary'
          : 'border-border bg-muted dark:bg-input/50',
        disabled && 'pointer-events-none opacity-50',
      )}
      {...rest}
    >
      <span
        className={cn(
          'absolute top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full shadow-sm transition-all duration-200',
          checked ? 'left-[calc(100%-1.45rem)] bg-primary-foreground' : 'left-0.5 bg-muted-foreground/60',
        )}
      />
    </button>
  );
}