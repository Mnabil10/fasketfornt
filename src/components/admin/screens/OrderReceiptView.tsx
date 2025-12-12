import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { fmtCurrency } from "../../../lib/money";
import type { OrderReceipt } from "../../../types/order";
import { Printer, FileDown } from "lucide-react";

type OrderReceiptViewProps = {
  receipt: OrderReceipt | null;
  isLoading?: boolean;
};

export function OrderReceiptView({ receipt, isLoading }: OrderReceiptViewProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";

  if (isLoading) {
    return <AdminTableSkeleton rows={3} columns={4} />;
  }

  if (!receipt) {
    return <p className="text-sm text-muted-foreground">{t("orders.no_receipt", "No receipt available")}</p>;
  }

  const currency = receipt.currency || "EGP";
  const printReceipt = () => window.print();
  const addressParts = [
    receipt.address.label,
    receipt.address.building,
    receipt.address.street,
    receipt.address.city,
    receipt.address.region,
    receipt.address.apartment,
  ].filter(Boolean);
  const addressLine = addressParts.join(", ");
  const zoneLabel = receipt.deliveryZone?.nameEn || receipt.deliveryZone?.nameAr || "";

  return (
    <div className="space-y-4" dir={i18n.dir()}>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="font-semibold">
            {t("orders.code", "Order")} #{receipt.code}
          </p>
          <p className="text-sm text-muted-foreground">{new Date(receipt.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex gap-2 print:hidden">
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
              <span className="font-semibold">{receipt.customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("orders.phone", "Phone")}</span>
              <span>{receipt.customer.phone}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("orders.address", "Address")}</span>
              <span className={isRTL ? "text-left" : "text-right"}>{addressLine}</span>
            </div>
            {zoneLabel && (
              <div className="flex justify-between">
                <span>{t("orders.zone", "Zone")}</span>
                <span>{zoneLabel}</span>
              </div>
            )}
            {receipt.driver?.fullName && (
              <>
                <div className="flex justify-between">
                  <span>{t("orders.driver", "Driver")}</span>
                  <span>{receipt.driver.fullName}</span>
                </div>
                {receipt.driver.phone && (
                  <div className="flex justify-between">
                    <span>{t("orders.phone", "Phone")}</span>
                    <span>{receipt.driver.phone}</span>
                  </div>
                )}
                {(receipt.driver.vehicleType || receipt.driver.plateNumber) && (
                  <div className="flex justify-between">
                    <span>{t("orders.vehicle", "Vehicle")}</span>
                    <span>{[receipt.driver.vehicleType, receipt.driver.plateNumber].filter(Boolean).join(" / ")}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between">
              <span>{t("orders.loyaltyUsed", "Loyalty used")}</span>
              <span>{receipt.loyaltyPointsRedeemed ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("orders.loyaltyEarned", "Loyalty earned")}</span>
              <span>{receipt.loyaltyPointsEarned ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>{t("orders.subtotal", "Subtotal")}</span>
              <span>{fmtCurrency(receipt.subtotalCents, currency)}</span>
            </div>
            {receipt.couponDiscountCents ? (
              <div className="flex justify-between">
                <span>{t("orders.coupon", "Coupon discount")}</span>
                <span>-{fmtCurrency(receipt.couponDiscountCents, currency)}</span>
              </div>
            ) : null}
            {receipt.loyaltyDiscountCents ? (
              <div className="flex justify-between">
                <span>{t("orders.loyalty", "Loyalty discount")}</span>
                <span>-{fmtCurrency(receipt.loyaltyDiscountCents, currency)}</span>
              </div>
            ) : null}
            {receipt.shippingFeeCents != null && (
              <div className="flex justify-between">
                <span>{t("orders.shipping", "Shipping")}</span>
                <span>{fmtCurrency(receipt.shippingFeeCents, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>{t("orders.total", "Total")}</span>
              <span>{fmtCurrency(receipt.totalCents, currency)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-auto border rounded-lg">
        <Table dir={i18n.dir()}>
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
              <TableRow key={item.productId || item.productName}>
                <TableCell className="font-medium">{item.productName}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{fmtCurrency(item.unitPriceCents, currency)}</TableCell>
                <TableCell className="text-right">{fmtCurrency(item.lineTotalCents, currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
