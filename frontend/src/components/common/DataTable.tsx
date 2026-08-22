import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounced } from '@/hooks/useDebounced';
import { getErrorMessage } from '@/services/api';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  sortable?: boolean;
  /** backend sort field; defaults to `key` */
  sortKey?: string;
  align?: 'left' | 'right' | 'center';
  /** applied to both <th> and <td> (e.g. responsive visibility) */
  className?: string;
  cell: (row: T) => ReactNode;
}

export interface DataTableFetchParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
  q?: string;
}

export interface DataTableResult<T> {
  rows: T[];
  total: number;
}

export interface DataTableProps<T, R extends DataTableResult<T> = DataTableResult<T>> {
  columns: DataTableColumn<T>[];
  /** Returns a page of rows. Closes over any external filters (status, date range, …). */
  fetcher: (params: DataTableFetchParams) => Promise<R>;
  /** Called with every successful fetch result (use for side-data like tab counts). */
  onResult?: (result: R) => void;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  searchPlaceholder?: string;
  /** extra filter controls rendered next to the search box */
  toolbar?: ReactNode;
  /** action controls rendered on the right (e.g. "New" button) */
  headerRight?: ReactNode;
  emptyState?: ReactNode;
  /** change this value to force a reload from the parent */
  refreshKey?: number | string;
  initialSort?: SortState;
}

type SortState = { key: string; order: 'asc' | 'desc' } | null;

export function DataTable<T, R extends DataTableResult<T> = DataTableResult<T>>({
  columns,
  fetcher,
  onResult,
  rowKey,
  onRowClick,
  pageSize = 20,
  searchPlaceholder,
  toolbar,
  headerRight,
  emptyState,
  refreshKey,
  initialSort = null,
}: DataTableProps<T, R>) {
  const { t } = useTranslation();

  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState<SortState>(initialSort);

  const debouncedSearch = useDebounced(searchInput, 350);

  // Refs keep the fetcher stable while still reading the latest external state.
  const paramsRef = useRef<{ sort?: string; order?: 'asc' | 'desc'; q: string; limit: number }>({
    sort: sort?.key,
    order: sort?.order,
    q: debouncedSearch,
    limit: pageSize,
  });
  paramsRef.current = {
    sort: sort?.key,
    order: sort?.order,
    q: debouncedSearch,
    limit: pageSize,
  };
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const load = useCallback(async (p: number, append: boolean) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const result = await fetcherRef.current({ ...paramsRef.current, page: p });
      onResultRef.current?.(result);
      setRows((prev) => (append ? [...prev, ...result.rows] : result.rows));
      setTotal(result.total);
      setPage(p);
    } catch (err) {
      setError(await getErrorMessage(err));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Reset to first page on filter / sort / search / external refresh changes.
  useEffect(() => {
    setRows([]);
    void load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, debouncedSearch, refreshKey]);

  // Infinite scroll: load the next page when the sentinel enters view.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loading &&
          !loadingMore &&
          rows.length > 0 &&
          rows.length < total
        ) {
          void load(page + 1, true);
        }
      },
      { rootMargin: '160px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rows.length, total, loading, loadingMore, page, load]);

  const toggleSort = (col: DataTableColumn<T>) => {
    if (!col.sortable) return;
    const key = col.sortKey ?? col.key;
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, order: 'asc' };
      if (prev.order === 'asc') return { key, order: 'desc' };
      return null; // third click → back to default ordering
    });
  };

  const hasMore = rows.length < total;

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      {/* toolbar (search + filters + actions) — always mounted to keep focus */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={searchPlaceholder ?? t('common.search')}
            className="h-9 w-full rounded-lg border border-border bg-card pr-3 pl-8 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/50"
          />
        </div>

        {toolbar}

        {headerRight && <div className="ml-auto flex">{headerRight}</div>}
      </div>

      {error && (
        <div className="rounded-lg border-2 border-dashed border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b-2 border-dashed text-left text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {columns.map((col) => {
                  const active = sort?.key === (col.sortKey ?? col.key);
                  const alignClass =
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                        ? 'text-center'
                        : 'text-left';
                  return (
                    <th
                      key={col.key}
                      className={cn('px-3 py-2', alignClass, col.className)}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col)}
                          className={cn(
                            'inline-flex items-center gap-1 uppercase transition-colors hover:text-foreground',
                            alignClass === 'text-right' && 'flex-row-reverse',
                            active && 'text-foreground',
                          )}
                        >
                          {col.header}
                          {active ? (
                            sort?.order === 'asc' ? (
                              <ArrowUp className="size-3" />
                            ) : (
                              <ArrowDown className="size-3" />
                            )
                          ) : (
                            <ChevronsUpDown className="size-3 opacity-50" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-10 text-center">
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      {t('common.loading')}
                    </span>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-0">
                    {emptyState ?? (
                      <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                        <p className="font-hand text-xl font-bold">{t('common.noResults')}</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'group cursor-pointer border-b border-dashed/60 transition-colors last:border-b-0 hover:bg-muted/50',
                      !onRowClick && 'cursor-default',
                    )}
                  >
                    {columns.map((col) => {
                      const alignClass =
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                            ? 'text-center'
                            : 'text-left';
                      return (
                        <td key={col.key} className={cn('px-3 py-2.5', alignClass, col.className)}>
                          {col.cell(row)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* sentinel + load-more indicator for infinite scroll */}
      <div ref={sentinelRef} className="h-px w-full">
        {loadingMore && (
          <div className="flex justify-center py-2">
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t('common.loading')}
            </span>
          </div>
        )}
        {!hasMore && rows.length > 0 && (
          <p className="py-2 text-center text-xs text-muted-foreground">
            {t('common.endOfList')}
          </p>
        )}
      </div>
    </div>
  );
}

export default DataTable;
