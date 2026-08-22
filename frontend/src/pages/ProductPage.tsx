import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Package, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InkModal } from '@/components/common/InkModal';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import {
  catalogApi,
  type Category,
  type Product,
  type ProductListParams,
} from '@/services/catalog';
import { getErrorMessage } from '@/services/api';
import { formatCurrency } from '@/utils/format';

const inputClass =
  'mt-1 h-9 w-full rounded-lg border-2 border-dashed border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/50';

type ModalState = { mode: 'create' } | { mode: 'edit'; product: Product } | null;

export default function ProductPage() {
  const { t } = useTranslation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  const [modal, setModal] = useState<ModalState>(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  useEffect(() => {
    void catalogApi
      .listCategories()
      .then((res) => setCategories(res.categories))
      .catch(() => setCategories([]));
  }, []);

  const reload = () => setReloadToken((k) => k + 1);

  const fetcher = useCallback(
    async (params: ProductListParams) => {
      const res = await catalogApi.listProducts({
        q: params.q,
        page: params.page,
        limit: params.limit,
        sort: params.sort,
        order: params.order,
        category_id: categoryFilter || undefined,
      });
      return { rows: res.products, total: res.total };
    },
    [categoryFilter],
  );

  const openCreate = () => {
    setModal({ mode: 'create' });
    setName('');
    setSku('');
    setPrice('');
    setStock('0');
    setCategoryId('');
    setIsAvailable(true);
    setFormError(null);
  };

  const openEdit = (product: Product) => {
    setModal({ mode: 'edit', product });
    setName(product.name);
    setSku(product.sku ?? '');
    setPrice(String(product.price));
    setStock(String(product.stock_quantity));
    setCategoryId(product.category?.id ?? '');
    setIsAvailable(product.is_available);
    setFormError(null);
  };

  const save = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      setFormError(t('product.nameRequired'));
      return;
    }
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setFormError(t('product.priceRequired'));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: cleanName,
        price: priceNum,
        sku: sku.trim() || undefined,
        stock_quantity: Math.max(0, Number(stock) || 0),
        category_id: categoryId || undefined,
        is_available: isAvailable,
      };
      if (modal?.mode === 'edit') {
        await catalogApi.updateProduct(modal.product.id, payload);
      } else {
        await catalogApi.createProduct(payload);
      }
      setModal(null);
      reload();
    } catch (err) {
      setFormError(await getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await catalogApi.deleteProduct(deleting.id);
      setDeleting(null);
      reload();
    } catch (err) {
      setFormError(await getErrorMessage(err));
      setDeleting(null);
    } finally {
      setDeletingBusy(false);
    }
  };

  const columns: DataTableColumn<Product>[] = [
    {
      key: 'name',
      header: t('product.name'),
      sortable: true,
      sortKey: 'name',
      cell: (p) => <span className="font-medium">{p.name}</span>,
    },
    {
      key: 'sku',
      header: t('product.sku'),
      cell: (p) => <span className="text-xs text-muted-foreground">{p.sku ?? '—'}</span>,
    },
    {
      key: 'category',
      header: t('product.category'),
      cell: (p) => <span className="text-sm">{p.category?.name ?? '—'}</span>,
    },
    {
      key: 'price',
      header: t('product.price'),
      align: 'right',
      sortable: true,
      sortKey: 'price',
      cell: (p) => (
        <span className="font-bold tabular-nums">{formatCurrency(p.price)}</span>
      ),
    },
    {
      key: 'stock',
      header: t('product.stock'),
      align: 'right',
      sortable: true,
      sortKey: 'stock_quantity',
      cell: (p) => {
        const low = p.stock_quantity <= 0;
        return (
          <span className={low ? 'font-semibold text-rose-600' : 'tabular-nums'}>
            {p.stock_quantity}
          </span>
        );
      },
    },
    {
      key: 'available',
      header: t('product.available'),
      cell: (p) =>
        p.is_available ? (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {t('product.active')}
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {t('product.hidden')}
          </span>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-16 px-2',
      cell: (p) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEdit(p);
            }}
            aria-label={t('common.edit')}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleting(p);
            }}
            aria-label={t('common.delete')}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <h1 className="font-hand text-3xl leading-snug font-bold tracking-tight">
          {t('product.title')}
        </h1>
      </div>

      <DataTable<Product>
        columns={columns}
        fetcher={fetcher}
        rowKey={(p) => p.id}
        searchPlaceholder={t('product.searchPlaceholder')}
        refreshKey={`${reloadToken}-${categoryFilter}`}
        pageSize={20}
        toolbar={
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
          >
            <option value="">{t('product.allCategories')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        }
        headerRight={
          <Button size="lg" onClick={openCreate} className="font-hand">
            <Plus className="size-4" />
            {t('product.create')}
          </Button>
        }
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl p-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
              <Package className="size-6" />
            </div>
            <p className="font-hand text-xl font-bold">{t('product.empty')}</p>
            <p className="max-w-xs text-sm text-muted-foreground">{t('product.emptyHint')}</p>
            <Button onClick={openCreate} className="mt-2 font-hand">
              <Plus className="size-4" />
              {t('product.create')}
            </Button>
          </div>
        }
      />

      {/* create / edit modal */}
      <InkModal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? t('product.edit') : t('product.create')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div className="rounded-lg border-2 border-dashed border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}
          <label className="block">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {t('product.name')}
            </span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void save();
              }}
              placeholder={t('product.namePlaceholder')}
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {t('product.sku')}
              </span>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder={t('product.skuPlaceholder')}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {t('product.category')}
              </span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={inputClass}
              >
                <option value="">{t('product.noCategory')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {t('product.price')}
              </span>
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {t('product.stock')}
              </span>
              <input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            <span className="text-sm">{t('product.availableLabel')}</span>
          </label>
        </div>
      </InkModal>

      {/* delete confirm modal */}
      <InkModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t('product.deleteConfirm', { name: deleting?.name ?? '' })}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deletingBusy}>
              {deletingBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t('common.delete')
              )}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20">
            <AlertTriangle className="size-4" />
          </div>
          <p className="text-sm text-muted-foreground">{t('product.deleteHint')}</p>
        </div>
      </InkModal>
    </div>
  );
}
