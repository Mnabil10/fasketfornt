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
  const dirClass = i18n.language === "ar" ? "text-right" : "text-left";

  if (!drivers.length) {
    return (
      <div className="text-center text-muted-foreground py-12 border rounded-lg">
        {t("drivers.empty", "No drivers found")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={dirClass}>{t("drivers.fullName", "Name")}</TableHead>
            <TableHead className={dirClass}>{t("drivers.phone", "Phone")}</TableHead>
            <TableHead className={dirClass}>{t("drivers.nationalId", "National ID")}</TableHead>
            <TableHead className={dirClass}>{t("drivers.vehicleTitle", "Vehicle")}</TableHead>
            <TableHead className={dirClass}>{t("drivers.status", "Status")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.map((driver) => (
            <TableRow key={driver.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-semibold">{driver.fullName}</p>
                    <p className="text-xs text-muted-foreground">{driver.id}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{driver.phone}</span>
                </div>
              </TableCell>
              <TableCell>{driver.nationalId || "-"}</TableCell>
              <TableCell>
                {driver.vehicle ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{driver.vehicle.type}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {driver.vehicle.plateNumber}{" "}
                      {driver.vehicle.color ? `• ${driver.vehicle.color}` : ""}
                    </p>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">{t("drivers.noVehicle", "No vehicle")}</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant={driver.isActive ? "outline" : "secondary"} className={driver.isActive ? "bg-green-50 text-green-700" : undefined}>
                    {driver.isActive ? t("drivers.active", "Active") : t("drivers.inactive", "Inactive")}
                  </Badge>
                  <Switch checked={driver.isActive} onCheckedChange={(checked) => onToggleStatus(driver.id, checked)} />
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onEdit(driver)}>
                  {t("common.edit", "Edit")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
