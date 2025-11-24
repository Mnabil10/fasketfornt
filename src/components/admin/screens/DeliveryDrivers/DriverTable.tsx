import React from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "../../../ui/badge";
import { Button } from "../../../ui/button";
import { Switch } from "../../../ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../ui/table";
import { Truck, Phone, BadgeCheck } from "lucide-react";
import type { DeliveryDriver } from "../../../../types/delivery";

type DriverTableProps = {
  drivers: DeliveryDriver[];
  onEdit: (driver: DeliveryDriver) => void;
  onToggleStatus: (driverId: string, isActive: boolean) => void;
};

export function DriverTable({ drivers, onEdit, onToggleStatus }: DriverTableProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const align = isRTL ? "text-right" : "text-left";
  const reverseRow = isRTL ? "flex-row-reverse text-right" : "";
  const actionsAlign = isRTL ? "text-left" : "text-right";

  const resolveImageUrl = (value: DeliveryDriver["nationalIdImage"] | string | null | undefined) => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (typeof value === "object" && "url" in value && value.url) return value.url;
    return null;
  };

  if (!drivers.length) {
    return (
      <div className="text-center text-muted-foreground py-12 border rounded-lg">
        {t("drivers.empty", "No drivers found")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" dir={i18n.dir()}>
      <Table dir={i18n.dir()} className={isRTL ? "text-right" : ""}>
        <TableHeader>
          <TableRow>
            <TableHead className={align}>{t("drivers.fullName", "Name")}</TableHead>
            <TableHead className={align}>{t("drivers.phone", "Phone")}</TableHead>
            <TableHead className={align}>{t("drivers.nationalId", "National ID")}</TableHead>
            <TableHead className={align}>{t("drivers.vehicleTitle", "Vehicle")}</TableHead>
            <TableHead className={align}>{t("drivers.documents", "Documents")}</TableHead>
            <TableHead className={align}>{t("drivers.status", "Status")}</TableHead>
            <TableHead className={actionsAlign}>{t("common.actions", "Actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.map((driver) => (
            <TableRow key={driver.id}>
              <TableCell className={align}>
                <div className={`flex items-center gap-2 ${reverseRow}`}>
                  <BadgeCheck className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-semibold">{driver.fullName}</p>
                    <p className="text-xs text-muted-foreground">{driver.id}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className={align}>
                <div className={`flex items-center gap-2 ${reverseRow}`}>
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{driver.phone}</span>
                </div>
              </TableCell>
              <TableCell className={align}>{driver.nationalId || "-"}</TableCell>
              <TableCell className={align}>
                {driver.vehicle ? (
                  <div className="space-y-1">
                    <div className={`flex items-center gap-2 ${reverseRow}`}>
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{driver.vehicle.type}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {driver.vehicle.plateNumber}
                      {driver.vehicle.color ? ` - ${driver.vehicle.color}` : ""}
                    </p>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">{t("drivers.noVehicle", "No vehicle")}</span>
                )}
              </TableCell>
              <TableCell className={align}>
                <div className="space-y-1 text-sm">
                  {resolveImageUrl(driver.nationalIdImage) ? (
                    <a
                      className="text-blue-600 underline block"
                      href={resolveImageUrl(driver.nationalIdImage) as string}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("drivers.nationalIdImage", "National ID image")}
                    </a>
                  ) : (
                    <span className="text-muted-foreground block">-</span>
                  )}
                  {(() => {
                    const licenseUrl = resolveImageUrl(driver.vehicle?.licenseImageUrl ?? driver.vehicle?.licenseImage);
                    return licenseUrl ? (
                      <a className="text-blue-600 underline block" href={licenseUrl} target="_blank" rel="noreferrer">
                        {t("drivers.vehicle.licenseImage", "Car license")}
                      </a>
                    ) : (
                      <span className="text-muted-foreground block">-</span>
                    );
                  })()}
                </div>
              </TableCell>
              <TableCell className={align}>
                <div className={`flex items-center gap-2 ${reverseRow}`}>
                  <Badge
                    variant={driver.isActive ? "outline" : "secondary"}
                    className={driver.isActive ? "bg-green-50 text-green-700" : undefined}
                  >
                    {driver.isActive ? t("drivers.active", "Active") : t("drivers.inactive", "Inactive")}
                  </Badge>
                  <Switch checked={driver.isActive} onCheckedChange={(checked) => onToggleStatus(driver.id, checked)} />
                </div>
              </TableCell>
              <TableCell className={actionsAlign}>
                <div className={isRTL ? "flex justify-start" : "flex justify-end"}>
                  <Button variant="ghost" size="sm" onClick={() => onEdit(driver)}>
                    {t("common.edit", "Edit")}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
