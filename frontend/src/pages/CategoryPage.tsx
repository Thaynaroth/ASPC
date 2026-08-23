import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, LayoutGrid, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InkModal } from '@/components/common/InkModal';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { catalogApi, type Category, type CategoryListParams } from '@/services/catalog';
import { getErrorMessage } from '@/services/api';

const inputClass =
  'mt-1 h-9 w-full rounded-lg border-2 border-dashed border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/50';

type ModalState = { mode: 'create' } | { mode: 'edit'; category: Category } | null;

export default function CategoryPage() {
  const { t } = useTranslation();

  const [reloadToken, setReloadToken] = useState(0);

  const [modal, setModal] = useState<ModalState>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const reload = () => setReloadToken((k) => k + 1);

  const fetcher = useCallback(
    async (params: CategoryListParams) => {
      const res = await catalogApi.listCategories({
        q: params.q,
        page: params.page,
        limit: params.limit,
        sort: params.sort,
        order: params.order,
      });
      return { rows: res.categories, total: res.total ?? res.categories.length };
    },
    [],
  );

  const openCreate = () => {
    setModal({ mode: 'create' });
    setName('');
    setDescription('');
    setFormError(null);
  };

  const openEdit = (category: Category) => {
    setModal({ mode: 'edit', category });
    setName(category.name);
    setDescription(category.description ?? '');
    setFormError(null);
  };

  const save = async () => {
    const clean = name.trim();
    if (!clean) {
      setFormError(t('category.nameRequired'));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (modal?.mode === 'edit') {
        await catalogApi.updateCategory(modal.category.id, {
          name: clean,
          description: description.trim() || undefined,
        });
      } else {
        await catalogApi.createCategory({
          name: clean,
          description: description.trim() || undefined,
        });
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
      await catalogApi.deleteCategory(deleting.id);
      setDeleting(null);
      reload();
    } catch (err) {
      setFormError(await getErrorMessage(err));
      setDeleting(null);
    } finally {
      setDeletingBusy(false);
    }
  };

  const columns: DataTableColumn<Category>[] = [
    {
      key: 'name',
      header: t('category.name'),
      sortable: true,
      sortKey: 'name',
      cell: (c) => <span className="font-medium">{c.name}</span>,
    },
    {
      key: 'description',
      header: t('category.description'),
      cell: (c) => (
        <span className="text-sm text-muted-foreground">{c.description || '—'}</span>
      ),
    },
    {
      key: 'products',
      header: t('category.productsHeader'),
      align: 'right',
      cell: (c) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {t('category.products', { count: c.product_count })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-16 px-2',
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEdit(c);
            }}
            aria-label={t('common.edit')}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleting(c);
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
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div>
          <h1 className="font-hand text-3xl leading-snug font-bold tracking-tight">
            {t('category.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('category.subtitle')}</p>
        </div>
      </div>

      <DataTable<Category>
        columns={columns}
        fetcher={fetcher}
        rowKey={(c) => c.id}
        searchPlaceholder={t('category.searchPlaceholder')}
        refreshKey={reloadToken}
        pageSize={20}
        headerRight={
          <Button size="lg" onClick={openCreate} className="font-hand">
            <Plus className="size-4" />
            {t('category.create')}
          </Button>
        }
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl p-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
              <LayoutGrid className="size-6" />
            </div>
            <p className="font-hand text-xl font-bold">{t('category.empty')}</p>
            <p className="max-w-xs text-sm text-muted-foreground">{t('category.emptyHint')}</p>
            <Button onClick={openCreate} className="mt-2 font-hand">
              <Plus className="size-4" />
              {t('category.create')}
            </Button>
          </div>
        }
      />

      {/* create / edit modal */}
      <InkModal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? t('category.edit') : t('category.create')}
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
              {t('category.name')}
            </span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void save();
              }}
              placeholder={t('category.namePlaceholder')}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {t('category.description')}
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t('category.description')}
              className="mt-1 w-full resize-none rounded-lg border-2 border-dashed border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/50"
            />
          </label>
        </div>
      </InkModal>

      {/* delete confirm modal */}
      <InkModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t('category.deleteConfirm', { name: deleting?.name ?? '' })}
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
          <p className="text-sm text-muted-foreground">{t('category.deleteHint')}</p>
        </div>
      </InkModal>
    </div>
  );
}
