import { useTranslation } from 'react-i18next';
import { Phone, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Customer } from '@/services/customers';

export default function CustomerSuggestions({
  suggestions,
  suggesting,
  highlight,
  onHover,
  onPick,
}: {
  suggestions: Customer[];
  suggesting: boolean;
  highlight: number;
  onHover: (index: number) => void;
  onPick: (customer: Customer) => void;
}) {
  const { t } = useTranslation();

  if (suggestions.length === 0 && !suggesting) return null;

  if (suggesting && suggestions.length === 0) {
    return (
      <p className="absolute right-0 left-8 top-full z-20 mt-1 rounded-md bg-popover px-3 py-1.5 text-xs text-muted-foreground shadow">
        {t('common.loading')}
      </p>
    );
  }

  return (
    <div className="absolute right-0 left-8 top-full z-20 mt-1 overflow-hidden rounded-lg border-2 border-dashed bg-popover shadow-md">
      {suggestions.map((customer, i) => (
        <button
          key={customer.id}
          onMouseEnter={() => onHover(i)}
          onClick={() => onPick(customer)}
          className={cn(
            'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
            i === highlight ? 'bg-muted' : 'hover:bg-muted/60',
          )}
        >
          <Phone className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold tabular-nums">
              {customer.phone || '—'}
            </span>
            {customer.name && (
              <span className="block truncate text-xs text-muted-foreground">
                <UserRound className="mr-1 inline size-3" />
                {customer.name}
              </span>
            )}
          </span>
          {customer.address && (
            <span className="hidden max-w-32 truncate text-xs text-muted-foreground sm:block">
              {customer.address}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
