import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, LayoutGrid, Package, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InkModal } from '@/components/common/InkModal';
import { catalogApi, type Category } from '@/services/catalog';
import { getErrorMessage } from '@/services/api';

export default function CategoryPage() {
  const { t } = useTranslation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; category: Category } | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await catalogApi.listCategories();
      setCategories(res.categories);
    } catch (err) {
      setError(await getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      await load();
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
      await load();
    } catch (err) {
      setError(await getErrorMessage(err));
      setDeleting(null);
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-hand text-3xl leading-snug font-bold tracking-tight">
            {t('category.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('category.subtitle')}</p>
        </div>
        <Button onClick={openCreate} className="font-hand text-base">
          <Plus className="size-4" />
          {t('category.create')}
        </Button>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border-2 border-dashed border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="cursor-pointer text-xs font-semibold underline underline-offset-2"
          >
            {t('common.close')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">{t('common.loading')}</span>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-card p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/20 dark:text-indigo-400">
            <LayoutGrid className="size-6" />
          </div>
          <p className="font-hand text-xl font-bold">{t('category.empty')}</p>
          <p className="max-w-xs text-sm text-muted-foreground">{t('category.emptyHint')}</p>
          <Button onClick={openCreate} className="mt-2 font-hand">
            <Plus className="size-4" />
            {t('category.create')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category, index) => (
            <div
              key={category.id}
              className={`group flex flex-col rounded-xl border-2 border-dashed bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                index % 2 === 0 ? '-rotate-1' : 'rotate-1'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/20 dark:text-indigo-400">
                    <LayoutGrid className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{category.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Package className="size-3" />
                      {t('category.products', { count: category.product_count })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 pointer-coarse:opacity-100">
                  <button
                    onClick={() => openEdit(category)}
                    aria-label={t('common.edit')}
                    className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleting(category)}
                    aria-label={t('common.delete')}
                    className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              {category.description && (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {category.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

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
              className="mt-1 h-9 w-full rounded-lg border-2 border-dashed border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/50"
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
              {deletingBusy ? t('common.loading') : t('common.delete')}
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
