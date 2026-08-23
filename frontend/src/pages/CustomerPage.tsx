import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Users, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InkModal } from '@/components/common/InkModal';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { customerApi, type Customer, type CustomerListParams } from '@/services/customers';
import { getErrorMessage } from '@/services/api';
import { formatKhmerPhone } from '@/utils/format';

const inputClass =
  'mt-1 h-9 w-full rounded-lg border-2 border-dashed border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/50';

type ModalState = { mode: 'create' } | { mode: 'edit'; customer: Customer } | null;

export default function CustomerPage() {
  const { t } = useTranslation();

  const [reloadToken, setReloadToken] = useState(0);

  const [modal, setModal] = useState<ModalState>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const reload = () => setReloadToken((k) => k + 1);

  const fetcher = useCallback(
    async (params: CustomerListParams) => {
      const res = await customerApi.list({
        q: params.q,
        page: params.page,
        limit: params.limit,
        sort: params.sort,
        order: params.order,
      });
      return { rows: res.customers, total: res.total };
    },
    [],
  );

  const openCreate = () => {
    setModal({ mode: 'create' });
    setName('');
    setPhone('');
    setAddress('');
    setFormError(null);
  };

  const openEdit = (customer: Customer) => {
    setModal({ mode: 'edit', customer });
    setName(customer.name ?? '');
    setPhone(customer.phone ?? '');
    setAddress(customer.address ?? '');
    setFormError(null);
  };

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      };
      if (modal?.mode === 'edit') {
        await customerApi.update(modal.customer.id, payload);
      } else {
        await customerApi.create(payload);
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
      await customerApi.delete(deleting.id);
      setDeleting(null);
      reload();
    } catch (err) {
      setFormError(await getErrorMessage(err));
      setDeleting(null);
    } finally {
      setDeletingBusy(false);
    }
  };

  const columns: DataTableColumn<Customer>[] = [
    {
      key: 'name',
      header: t('customer.name'),
      sortable: true,
      sortKey: 'name',
      cell: (c) => <span className="font-medium">{c.name ?? '—'}</span>,
    },
    {
      key: 'phone',
      header: t('customer.phone'),
      sortable: true,
      sortKey: 'phone',
      cell: (c) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {c.phone ? formatKhmerPhone(c.phone) : '—'}
        </span>
      ),
    },
    {
      key: 'address',
      header: t('customer.address'),
      cell: (c) => (
        <span className="text-sm text-muted-foreground">{c.address ?? '—'}</span>
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
        <h1 className="font-hand text-3xl leading-snug font-bold tracking-tight">
          {t('customer.title')}
        </h1>
      </div>

      <DataTable<Customer>
        columns={columns}
        fetcher={fetcher}
        rowKey={(c) => c.id}
        searchPlaceholder={t('customer.searchPlaceholder')}
        refreshKey={reloadToken}
        pageSize={20}
        headerRight={
          <Button size="lg" onClick={openCreate} className="font-hand">
            <Plus className="size-4" />
            {t('customer.create')}
          </Button>
        }
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl p-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20 dark:text-sky-400">
              <Users className="size-6" />
            </div>
            <p className="font-hand text-xl font-bold">{t('customer.empty')}</p>
            <p className="max-w-xs text-sm text-muted-foreground">{t('customer.emptyHint')}</p>
            <Button onClick={openCreate} className="mt-2 font-hand">
              <Plus className="size-4" />
              {t('customer.create')}
            </Button>
          </div>
        }
      />

      {/* create / edit modal */}
      <InkModal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? t('customer.edit') : t('customer.create')}
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
              {t('customer.name')}
            </span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('customer.namePlaceholder')}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {t('customer.phone')}
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('customer.phonePlaceholder')}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {t('customer.address')}
            </span>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder={t('customer.addressPlaceholder')}
              className="mt-1 w-full resize-none rounded-lg border-2 border-dashed border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/50"
            />
          </label>
        </div>
      </InkModal>

      {/* delete confirm modal */}
      <InkModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t('customer.deleteConfirm', { name: deleting?.name ?? deleting?.phone ?? '' })}
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
          <p className="text-sm text-muted-foreground">{t('customer.deleteHint')}</p>
        </div>
      </InkModal>
    </div>
  );
}
