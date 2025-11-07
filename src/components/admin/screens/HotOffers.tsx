import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listHotOffers, type Product } from '../../../services/products.service';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Search } from 'lucide-react';
import { fmtEGP } from '../../../lib/money';

export function HotOffersList() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);

  async function load() {
    const res = await listHotOffers({ q, page, pageSize });
    setItems(res.items);
    setTotal(res.total);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, page]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-poppins text-3xl text-gray-900" style={{ fontWeight: 700 }}>
          {t('products.hotOffers') || 'Hot Offers'}
        </h1>
        <p className="text-gray-600 mt-1">{t('products.hotOffersSubtitle') || 'Products marked as hot offers'}</p>
      </div>
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input className="pl-9" placeholder={t('filters.searchPlaceholder') || 'Search'} value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
          </div>
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('products.name') || 'Name'}</TableHead>
                  <TableHead>{t('products.price') || 'Price'}</TableHead>
                  <TableHead>{t('products.stock') || 'Stock'}</TableHead>
                  <TableHead>{t('products.status') || 'Status'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{fmtEGP(p.priceCents)}</TableCell>
                    <TableCell>{p.stock}</TableCell>
                    <TableCell>{p.status}</TableCell>
                  </TableRow>
                ))}
                {!items.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">{t('app.table.noData') || 'No data'}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{t('app.table.total') || 'Total'}: {total}</span>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 border rounded" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
              <span>{t('app.table.page') || 'Page'} {page} / {Math.max(1, Math.ceil(total / pageSize))}</span>
              <button className="px-3 py-1 border rounded" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
