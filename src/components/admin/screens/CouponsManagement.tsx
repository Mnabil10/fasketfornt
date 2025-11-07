import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listCoupons, createCoupon, updateCoupon, type Coupon } from '../../../services/coupons.service';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';
import { Plus, Search, Edit } from 'lucide-react';
import { toast } from 'sonner';

export function CouponsManagement() {
  const { t } = useTranslation();

  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [items, setItems] = useState<Coupon[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<{
    code: string;
    type: 'PERCENT' | 'FIXED';
    valueCents: string; // use string for input
    isActive: boolean;
    startsAt: string;
    endsAt: string;
    minOrderCents: string;
    maxDiscountCents: string;
  }>({
    code: '',
    type: 'PERCENT',
    valueCents: '',
    isActive: true,
    startsAt: '',
    endsAt: '',
    minOrderCents: '',
    maxDiscountCents: '',
  });

  async function load() {
    setLoading(true);
    try {
      const res = await listCoupons({ q, page, pageSize });
      setItems(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page]);

  function openCreate() {
    setEditing(null);
    setForm({ code: '', type: 'PERCENT', valueCents: '', isActive: true, startsAt: '', endsAt: '', minOrderCents: '', maxDiscountCents: '' });
    setOpen(true);
  }
  function openEdit(c: Coupon) {
    setEditing(c);
    setForm({
      code: c.code || '',
      type: c.type,
      valueCents: String(c.valueCents ?? ''),
      isActive: !!c.isActive,
      startsAt: c.startsAt || '',
      endsAt: c.endsAt || '',
      minOrderCents: String(c.minOrderCents ?? ''),
      maxDiscountCents: String(c.maxDiscountCents ?? ''),
    });
    setOpen(true);
  }

  async function save() {
    try {
      const payload: any = {
        code: form.code.trim(),
        type: form.type,
        valueCents: form.type === 'PERCENT' ? Math.trunc(Number(form.valueCents || 0)) : Math.trunc(Number(form.valueCents || 0)),
        isActive: !!form.isActive,
        startsAt: form.startsAt || undefined,
        endsAt: form.endsAt || undefined,
        minOrderCents: form.minOrderCents ? Math.trunc(Number(form.minOrderCents)) : undefined,
        maxDiscountCents: form.maxDiscountCents ? Math.trunc(Number(form.maxDiscountCents)) : undefined,
      };
      if (!payload.code) {
        toast.error(t('coupons.code_required') || 'Code is required');
        return;
      }

      if (editing) {
        await updateCoupon(editing.id, payload);
        toast.success(t('coupons.updated') || 'Coupon updated');
      } else {
        await createCoupon(payload);
        toast.success(t('coupons.created') || 'Coupon created');
      }
      setOpen(false);
      await load();
    } catch (e: any) {
      toast.error(String(e?.response?.data?.message || e?.message || 'Save failed'));
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-poppins text-3xl text-gray-900" style={{ fontWeight: 700 }}>
            {t('coupons.title') || 'Coupons'}
          </h1>
          <p className="text-gray-600 mt-1">{t('coupons.subtitle') || 'Create and manage discount coupons'}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" /> {t('coupons.addNew') || 'New Coupon'}
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{editing ? (t('coupons.edit') || 'Edit Coupon') : (t('coupons.addNew') || 'New Coupon')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('coupons.code', 'Code')}</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('coupons.type', 'Type')}</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">{t('coupons.percent', 'PERCENT')}</SelectItem>
                    <SelectItem value="FIXED">{t('coupons.fixed', 'FIXED')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{form.type === 'PERCENT' ? t('coupons.percent', 'Percent') : t('coupons.value', 'Value (cents)')}</Label>
                <Input inputMode="numeric" value={form.valueCents} onChange={(e) => setForm({ ...form, valueCents: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('coupons.active', 'Active')}</Label>
                <div className="h-10 flex items-center"><Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /></div>
              </div>
              <div className="space-y-2">
                <Label>{t('coupons.startsAt', 'Starts At (ISO)')}</Label>
                <Input placeholder="2025-01-01T00:00:00Z" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('coupons.endsAt', 'Ends At (ISO)')}</Label>
                <Input placeholder="2025-12-31T23:59:59Z" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('coupons.minOrderCents', 'Min Order (cents)')}</Label>
                <Input inputMode="numeric" value={form.minOrderCents} onChange={(e) => setForm({ ...form, minOrderCents: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('coupons.maxDiscountCents', 'Max Discount (cents)')}</Label>
                <Input inputMode="numeric" value={form.maxDiscountCents} onChange={(e) => setForm({ ...form, maxDiscountCents: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>{t('app.actions.cancel', 'Cancel')}</Button>
              <Button onClick={save}>{t('app.actions.save', 'Save')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input className="pl-9" placeholder={t('coupons.searchPlaceholder', 'Search code')} value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('coupons.code', 'Code')}</TableHead>
                  <TableHead>{t('coupons.type', 'Type')}</TableHead>
                  <TableHead>{t('coupons.value', 'Value')}</TableHead>
                  <TableHead>{t('coupons.active', 'Active')}</TableHead>
                  <TableHead>{t('coupons.startsAt', 'Starts')}</TableHead>
                  <TableHead>{t('coupons.endsAt', 'Ends')}</TableHead>
                  <TableHead className="text-right">{t('app.actions.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono">{c.code}</TableCell>
                    <TableCell>{c.type}</TableCell>
                    <TableCell>{c.valueCents}</TableCell>
                    <TableCell>{c.isActive ? t('app.yes', 'Yes') : t('app.no', 'No')}</TableCell>
                    <TableCell className="text-xs text-gray-600">{c.startsAt || '-'}</TableCell>
                    <TableCell className="text-xs text-gray-600">{c.endsAt || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" aria-label={t('coupons.edit', 'Edit')} onClick={() => openEdit(c)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!items.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500">{t('app.table.noData') || 'No data'}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {t('app.table.total') || 'Total'}: {total}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t('app.actions.prev','Prev')}</Button>
              <span>
                {t('app.table.page') || 'Page'} {page} / {Math.max(1, Math.ceil(total / pageSize))}
              </span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((p) => p + 1)}>{t('app.actions.next','Next')}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
