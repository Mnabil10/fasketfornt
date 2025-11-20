import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { fmtEGP } from "../../../lib/money";
import type { OrderReceipt } from "../../../types/receipt";
import { Printer, FileDown } from "lucide-react";

type OrderReceiptViewProps = {
  receipt: OrderReceipt | null;
  isLoading?: boolean;
};

export function OrderReceiptView({ receipt, isLoading }: OrderReceiptViewProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return <AdminTableSkeleton rows={3} columns={4} />;
  }

  if (!receipt) {
    return <p className="text-sm text-muted-foreground">{t("orders.no_receipt", "No receipt available")}</p>;
  }

  const printReceipt = () => window.print();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{t("orders.code", "Order")} #{receipt.code}</p>
          <p className="text-sm text-muted-foreground">{new Date(receipt.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={printReceipt}>
            <Printer className="w-4 h-4 mr-1" />
            {t("orders.print", "Print")}
          </Button>
          <Button variant="outline" size="sm" onClick={printReceipt}>
            <FileDown className="w-4 h-4 mr-1" />
            {t("orders.exportPdf", "Export PDF")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>{t("orders.customer", "Customer")}</span>
              <span className="font-semibold">{receipt.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("orders.phone", "Phone")}</span>
              <span>{receipt.customerPhone}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("orders.address", "Address")}</span>
              <span className="text-right">{receipt.address}</span>
            </div>
            {receipt.zone?.name && (
              <div className="flex justify-between">
                <span>{t("orders.zone", "Zone")}</span>
                <span>{receipt.zone.name}</span>
              </div>
            )}
            {receipt.driver?.fullName && (
              <div className="flex justify-between">
                <span>{t("orders.driver", "Driver")}</span>
                <span>{receipt.driver.fullName}</span>
              </div>
            )}
            {receipt.loyalty && (
              <>
                {receipt.loyalty.usedPoints != null && (
                  <div className="flex justify-between">
                    <span>{t("orders.loyaltyUsed", "Loyalty used")}</span>
                    <span>{receipt.loyalty.usedPoints}</span>
                  </div>
                )}
                {receipt.loyalty.earnedPoints != null && (
                  <div className="flex justify-between">
                    <span>{t("orders.loyaltyEarned", "Loyalty earned")}</span>
                    <span>{receipt.loyalty.earnedPoints}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>{t("orders.subtotal", "Subtotal")}</span>
              <span>{fmtEGP(receipt.subtotalCents)}</span>
            </div>
            {receipt.couponDiscountCents ? (
              <div className="flex justify-between">
                <span>{t("orders.coupon", "Coupon discount")}</span>
                <span>-{fmtEGP(receipt.couponDiscountCents)}</span>
              </div>
            ) : null}
            {receipt.loyaltyDiscountCents ? (
              <div className="flex justify-between">
                <span>{t("orders.loyalty", "Loyalty discount")}</span>
                <span>-{fmtEGP(receipt.loyaltyDiscountCents)}</span>
              </div>
            ) : null}
            {receipt.shippingFeeCents != null && (
              <div className="flex justify-between">
                <span>{t("orders.shipping", "Shipping")}</span>
                <span>{fmtEGP(receipt.shippingFeeCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>{t("orders.total", "Total")}</span>
              <span>{fmtEGP(receipt.totalCents)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("orders.item", "Item")}</TableHead>
              <TableHead>{t("orders.qty", "Qty")}</TableHead>
              <TableHead>{t("orders.unitPrice", "Unit price")}</TableHead>
              <TableHead className="text-right">{t("orders.total", "Total")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipt.items.map((item) => (
              <TableRow key={item.id || item.productId || item.productName}>
                <TableCell className="font-medium">{item.productName}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{fmtEGP(item.unitPriceCents)}</TableCell>
                <TableCell className="text-right">{fmtEGP(item.totalCents)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
