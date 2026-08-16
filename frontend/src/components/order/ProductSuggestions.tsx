import { useTranslation } from 'react-i18next';
import { PackagePlus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/services/catalog';
import { formatCurrency } from '@/utils/format';

export default function ProductSuggestions({
  query,
  suggestions,
  suggesting,
  highlight,
  onHover,
  onPick,
  onAddNew,
}: {
  query: string;
  suggestions: Product[];
  suggesting: boolean;
  highlight: number;
  onHover: (index: number) => void;
  onPick: (product: Product) => void;
  onAddNew: () => void;
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
      {suggestions.map((product, i) => (
        <button
          key={product.id}
          onMouseEnter={() => onHover(i)}
          onClick={() => onPick(product)}
          className={cn(
            'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
            i === highlight ? 'bg-muted' : 'hover:bg-muted/60',
          )}
        >
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate font-medium">{product.name}</span>
          {product.stock_quantity === 0 && (
            <span className="text-[10px] text-muted-foreground">{t('order.inStock')}: 0</span>
          )}
          <span className="shrink-0 font-semibold tabular-nums">
            {formatCurrency(product.price, 'KHR')}
          </span>
        </button>
      ))}
      {!suggesting && (
        <button
          onClick={onAddNew}
          className="flex w-full cursor-pointer items-center gap-2 border-t border-dashed px-3 py-2 text-left text-sm text-violet-600 transition-colors hover:bg-muted/60 dark:text-violet-400"
        >
          <PackagePlus className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {t('order.newProductHint')}: “{query.trim()}”
          </span>
        </button>
      )}
    </div>
  );
}
