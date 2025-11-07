import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getSettings,
  updateGeneral,
  updateDelivery,
  updatePayment,
  updateNotifications,
  updateSystem,
  SettingsResponse,
} from "../../../services/settings.service";

// UI
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Switch } from "../../ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Badge } from "../../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { DollarSign, Save, RotateCcw, Store, Truck, CreditCard, Bell, Shield } from "lucide-react";
import { Toaster, toast } from "sonner";


type Jsonish = Record<string, any> | any[] | null | undefined;

export function SettingsManagement() {
  const { t } = useTranslation();

  // loading / error
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // tabs/dirty
  const [currentTab, setCurrentTab] = useState<"general" | "delivery" | "payment" | "notifications" | "system">("general");
  const [hasChanges, setHasChanges] = useState(false);

  // server snapshot (for reset)
  const [snapshot, setSnapshot] = useState<SettingsResponse | null>(null);

  // section states
  const [general, setGeneral] = useState<SettingsResponse["general"]>({
    storeName: "",
    storeDescription: "",
    contactEmail: "",
    contactPhone: "",
    storeAddress: "",
    businessHours: {},
  });
  const [delivery, setDelivery] = useState<SettingsResponse["delivery"]>({
    deliveryFee: 0,
    freeDeliveryMinimum: 0,
    estimatedDeliveryTime: "",
    maxDeliveryRadius: 0,
    deliveryZones: [],
  });
  const [payment, setPayment] = useState<SettingsResponse["payment"]>({});
  const [notifications, setNotifications] = useState<SettingsResponse["notifications"]>({});
  const [system, setSystem] = useState<SettingsResponse["system"]>({
    maintenanceMode: false,
    allowRegistrations: true,
    requireEmailVerification: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    dataRetentionDays: 365,
    backupFrequency: "daily",
    timezone: "Africa/Cairo",
    language: "ar",
    currency: "EGP",
  });

  // json editors (for the few raw JSON fields)
  const [jsonErr, setJsonErr] = useState<Record<string, string | null>>({});

  function markDirty() {
    if (!hasChanges) setHasChanges(true);
  }

  function setJson<T extends Jsonish>(key: string, setter: (v: any) => void, nextText: string) {
    try {
      const parsed = nextText.trim() ? JSON.parse(nextText) : null;
      setter(parsed as T);
      setJsonErr((p) => ({ ...p, [key]: null }));
      markDirty();
    } catch (e: any) {
      setJsonErr((p) => ({ ...p, [key]: t("app.notifications.error") || "Invalid JSON" }));
    }
  }

  function pretty(v: Jsonish) {
    try {
      return JSON.stringify(v ?? (Array.isArray(v) ? [] : {}), null, 2);
    } catch {
      return "";
    }
  }

  // load initial
  useEffect(() => {
    (async () => {
      try {
        const s = await getSettings();
        setSnapshot(s);
        setGeneral(s.general);
        setDelivery(s.delivery);
        setPayment(s.payment);
        setNotifications(s.notifications);
        setSystem(s.system);
      } catch (e: any) {
        setErr(e?.response?.data?.message || e?.message || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const canSave = useMemo(() => hasChanges && Object.values(jsonErr).every((e) => !e), [hasChanges, jsonErr]);

  async function save(section: "general" | "delivery" | "payment" | "notifications" | "system") {
    try {
      if (section === "general") await updateGeneral(general);
      if (section === "delivery") await updateDelivery(delivery);
      if (section === "payment") await updatePayment(payment);
      if (section === "notifications") await updateNotifications(notifications);
      if (section === "system") await updateSystem(system);

      toast.success(t("app.notifications.saved") || "Saved");
      setHasChanges(false);

      // refresh snapshot for accurate reset
      const s = await getSettings();
      setSnapshot(s);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || (t("app.notifications.error") || "Error"));
    }
  }

  function reset(section: "general" | "delivery" | "payment" | "notifications" | "system") {
    if (!snapshot) return;
    if (section === "general") setGeneral(snapshot.general);
    if (section === "delivery") setDelivery(snapshot.delivery);
    if (section === "payment") setPayment(snapshot.payment);
    if (section === "notifications") setNotifications(snapshot.notifications);
    if (section === "system") setSystem(snapshot.system);
    setJsonErr({});
    setHasChanges(false);
    toast.info(t("app.actions.reset") || "Reset");
  }

  if (loading) return <div className="p-6">{t("app.loading")}</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-poppins text-3xl text-gray-900" style={{ fontWeight: 700 }}>
            {t("settings.title")}
          </h1>
          <p className="text-gray-600 mt-1">{t("products.subtitle")}</p>
        </div>
        {hasChanges && (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
            {t("app.actions.update") || "Update"}
          </Badge>
        )}
      </div>

      <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as any)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Store className="w-4 h-4" /> {t("settings.general")}
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <Truck className="w-4 h-4" /> {t("settings.delivery")}
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> {t("settings.payment")}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" /> {t("settings.notifications")}
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> {t("settings.system")}
          </TabsTrigger>
        </TabsList>

        {/* GENERAL */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.general")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="storeName">{t("settings.generalFields.storeName")}</Label>
                  <Input
                    id="storeName"
                    value={general.storeName || ""}
                    onChange={(e) => {
                      setGeneral((p) => ({ ...p, storeName: e.target.value }));
                      markDirty();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">{t("settings.generalFields.contactEmail")}</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={general.contactEmail || ""}
                    onChange={(e) => {
                      setGeneral((p) => ({ ...p, contactEmail: e.target.value }));
                      markDirty();
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeDescription">{t("settings.generalFields.storeDescription")}</Label>
                <Textarea
                  id="storeDescription"
                  value={general.storeDescription || ""}
                  onChange={(e) => {
                    setGeneral((p) => ({ ...p, storeDescription: e.target.value }));
                    markDirty();
                  }}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">{t("settings.generalFields.contactPhone")}</Label>
                  <Input
                    id="contactPhone"
                    value={general.contactPhone || ""}
                    onChange={(e) => {
                      setGeneral((p) => ({ ...p, contactPhone: e.target.value }));
                      markDirty();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeAddress">{t("settings.generalFields.storeAddress")}</Label>
                  <Input
                    id="storeAddress"
                    value={general.storeAddress || ""}
                    onChange={(e) => {
                      setGeneral((p) => ({ ...p, storeAddress: e.target.value }));
                      markDirty();
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Hours: per-day toggles and time inputs */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.generalFields.businessHours")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(
                ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const
              ).map((day) => {
                const hours = (general.businessHours as any)?.[day] || { open: "09:00", close: "18:00", enabled: true };
                return (
                  <div key={day} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={!!hours.enabled}
                        onCheckedChange={(checked) => {
                          setGeneral((p) => ({
                            ...p,
                            businessHours: {
                              ...(p.businessHours || {}),
                              [day]: { ...(p.businessHours?.[day] || {}), enabled: checked },
                            },
                          }));
                          markDirty();
                        }}
                      />
                      <span className="capitalize">{day}</span>
                    </div>
                    {hours.enabled && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={hours.open || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setGeneral((p) => ({
                              ...p,
                              businessHours: {
                                ...(p.businessHours || {}),
                                [day]: { ...(p.businessHours?.[day] || {}), open: v },
                              },
                            }));
                            markDirty();
                          }}
                          className="w-24"
                        />
                        <span>—</span>
                        <Input
                          type="time"
                          value={hours.close || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setGeneral((p) => ({
                              ...p,
                              businessHours: {
                                ...(p.businessHours || {}),
                                [day]: { ...(p.businessHours?.[day] || {}), close: v },
                              },
                            }));
                            markDirty();
                          }}
                          className="w-24"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={() => save("general")} disabled={!canSave} className="flex items-center gap-2">
              <Save className="w-4 h-4" /> {t("settings.saveGeneral")}
            </Button>
            <Button variant="outline" onClick={() => reset("general")} className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> {t("app.actions.reset") || "Reset"}
            </Button>
          </div>
        </TabsContent>

        {/* DELIVERY */}
        <TabsContent value="delivery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.delivery")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryFee">{t("settings.deliveryFields.deliveryFee")}</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="deliveryFee"
                      type="number"
                      step="0.01"
                      value={delivery.deliveryFee ?? 0}
                      onChange={(e) => {
                        setDelivery((p) => ({ ...p, deliveryFee: parseFloat(e.target.value || "0") }));
                        markDirty();
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="freeDeliveryMinimum">{t("settings.deliveryFields.freeDeliveryMinimum")}</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="freeDeliveryMinimum"
                      type="number"
                      step="0.01"
                      value={delivery.freeDeliveryMinimum ?? 0}
                      onChange={(e) => {
                        setDelivery((p) => ({ ...p, freeDeliveryMinimum: parseFloat(e.target.value || "0") }));
                        markDirty();
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimatedDeliveryTime">{t("settings.deliveryFields.estimatedDeliveryTime")}</Label>
                  <Input
                    id="estimatedDeliveryTime"
                    value={delivery.estimatedDeliveryTime || ""}
                    onChange={(e) => {
                      setDelivery((p) => ({ ...p, estimatedDeliveryTime: e.target.value }));
                      markDirty();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxDeliveryRadius">{t("settings.deliveryFields.maxDeliveryRadius")}</Label>
                  <Input
                    id="maxDeliveryRadius"
                    type="number"
                    value={delivery.maxDeliveryRadius ?? 0}
                    onChange={(e) => {
                      setDelivery((p) => ({ ...p, maxDeliveryRadius: parseInt(e.target.value || "0") }));
                      markDirty();
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("settings.deliveryFields.deliveryZones")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-600">
                    <tr>
                      <th className="p-2">{t("categories.name") || "Name"}</th>
                      <th className="p-2">{t("settings.deliveryFields.deliveryFee") || "Fee"}</th>
                      <th className="p-2">{t("app.active") || "Active"}</th>
                      <th className="p-2 text-right">{t("app.actions.title") || "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(delivery.deliveryZones || []).map((zone, idx) => (
                      <tr key={`${zone.name}-${idx}`} className="border-t">
                        <td className="p-2">
                          <Input
                            value={zone.name || ""}
                            onChange={(e) => {
                              const arr = [...(delivery.deliveryZones || [])];
                              arr[idx] = { ...zone, name: e.target.value };
                              setDelivery((p) => ({ ...p, deliveryZones: arr }));
                              markDirty();
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={zone.fee ?? 0}
                            onChange={(e) => {
                              const arr = [...(delivery.deliveryZones || [])];
                              arr[idx] = { ...zone, fee: parseFloat(e.target.value || "0") };
                              setDelivery((p) => ({ ...p, deliveryZones: arr }));
                              markDirty();
                            }}/>
                        </td>
                        <td className="p-2">
                          <Switch
                            checked={!!zone.enabled}
                            onCheckedChange={(checked) => {
                              const arr = [...(delivery.deliveryZones || [])];
                              arr[idx] = { ...zone, enabled: checked };
                              setDelivery((p) => ({ ...p, deliveryZones: arr }));
                              markDirty();
                            }}
                          />
                        </td>
                        <td className="p-2 text-right">
                          <Button
                            variant="destructive"
                            onClick={() => {
                              const arr = [...(delivery.deliveryZones || [])];
                              arr.splice(idx, 1);
                              setDelivery((p) => ({ ...p, deliveryZones: arr }));
                              markDirty();
                            }}
                          >
                            {t("app.actions.delete") || "Delete"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const arr = [...(delivery.deliveryZones || [])];
                  arr.push({ name: "", fee: 0, enabled: true });
                  setDelivery((p) => ({ ...p, deliveryZones: arr }));
                  markDirty();
                }}
              >
                + {t("app.actions.add") || "Add Zone"}
              </Button>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={() => save("delivery")} disabled={!canSave} className="flex items-center gap-2">
              <Save className="w-4 h-4" /> {t("settings.saveDelivery")}
            </Button>
            <Button variant="outline" onClick={() => reset("delivery")} className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> {t("app.actions.reset") || "Reset"}
            </Button>
          </div>
        </TabsContent>

        {/* PAYMENT */}
        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.payment")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cash on Delivery */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="mr-3">
                  <div className="font-medium">{t("settings.paymentFields.cashOnDelivery") || "Cash on Delivery"}</div>
                  <div className="text-sm text-gray-600">{t("settings.savePayment") ? "Accept cash payments" : "Accept cash payments"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!payment.cashOnDelivery?.enabled}
                    onCheckedChange={(checked) => {
                      setPayment((p) => ({ ...p, cashOnDelivery: { ...(p.cashOnDelivery || {}), enabled: checked } }));
                      markDirty();
                    }}
                  />
                  {!!payment.cashOnDelivery?.enabled && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Max</span>
                      <Input
                        type="number"
                        value={payment.cashOnDelivery?.maxAmount ?? 0}
                        onChange={(e) => {
                          setPayment((p) => ({ ...p, cashOnDelivery: { ...(p.cashOnDelivery || {}), maxAmount: parseFloat(e.target.value || "0") } }));
                          markDirty();
                        }}
                        className="w-24"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Credit Cards */}
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{t("settings.paymentFields.creditCards") || "Credit Cards"}</div>
                  <Switch
                    checked={!!payment.creditCards?.enabled}
                    onCheckedChange={(checked) => {
                      setPayment((p) => ({ ...p, creditCards: { ...(p.creditCards || { acceptedCards: [] }), enabled: checked } }));
                      markDirty();
                    }}
                  />
                </div>
                {!!payment.creditCards?.enabled && (
                  <div className="mt-3">
                    <div className="text-sm font-medium mb-2">Accepted</div>
                    <div className="flex gap-2 flex-wrap">
                      {["visa","mastercard","amex","discover"].map((card) => {
                        const current = payment.creditCards?.acceptedCards || [];
                        const active = current.includes(card);
                        return (
                          <Badge
                            key={card}
                            variant={active ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => {
                              const next = active ? current.filter((c) => c !== card) : [...current, card];
                              setPayment((p) => ({ ...p, creditCards: { ...(p.creditCards || {}), acceptedCards: next } }));
                              markDirty();
                            }}
                          >
                            {card.toUpperCase()}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Digital Wallets */}
              <div className="p-3 border rounded-lg space-y-3">
                <div className="font-medium">{t("settings.paymentFields.digitalWallets") || "Digital Wallets"}</div>
                {(["paypal","applePay","googlePay"] as const).map((w) => {
                  const cfg = (payment.digitalWallets as any)?.[w] || {};
                  return (
                    <div key={w} className="flex items-center justify-between p-2 border rounded">
                      <div className="mr-3 font-medium capitalize">{w}</div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!cfg.enabled}
                          onCheckedChange={(checked) => {
                            setPayment((p) => ({
                              ...p,
                              digitalWallets: {
                                ...(p.digitalWallets || {}),
                                [w]: { ...((p.digitalWallets as any)?.[w] || {}), enabled: checked },
                              },
                            }));
                            markDirty();
                          }}
                        />
                        {!!cfg.enabled && (
                          <Input
                            placeholder="merchantId"
                            value={cfg.merchantId || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setPayment((p) => ({
                                ...p,
                                digitalWallets: {
                                  ...(p.digitalWallets || {}),
                                  [w]: { ...((p.digitalWallets as any)?.[w] || {}), merchantId: v },
                                },
                              }));
                              markDirty();
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stripe */}
              <div className="p-3 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{t("settings.paymentFields.stripe") || "Stripe"}</div>
                  <Switch
                    checked={!!payment.stripe?.enabled}
                    onCheckedChange={(checked) => {
                      setPayment((p) => ({ ...p, stripe: { ...(p.stripe || {}), enabled: checked } }));
                      markDirty();
                    }}
                  />
                </div>
                {!!payment.stripe?.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Public Key</Label>
                      <Input
                        type="password"
                        value={payment.stripe?.publicKey || ""}
                        onChange={(e) => { setPayment((p) => ({ ...p, stripe: { ...(p.stripe || {}), publicKey: e.target.value } })); markDirty(); }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Secret Key</Label>
                      <Input
                        type="password"
                        value={payment.stripe?.secretKey || ""}
                        onChange={(e) => { setPayment((p) => ({ ...p, stripe: { ...(p.stripe || {}), secretKey: e.target.value } })); markDirty(); }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Webhook Secret</Label>
                      <Input
                        type="password"
                        value={payment.stripe?.webhookSecret || ""}
                        onChange={(e) => { setPayment((p) => ({ ...p, stripe: { ...(p.stripe || {}), webhookSecret: e.target.value } })); markDirty(); }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={() => save("payment")} disabled={!canSave} className="flex items-center gap-2">
              <Save className="w-4 h-4" /> {t("settings.savePayment")}
            </Button>
            <Button variant="outline" onClick={() => reset("payment")} className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> {t("app.actions.reset") || "Reset"}
            </Button>
          </div>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.notifications")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Order notifications */}
              <div className="p-3 border rounded-lg space-y-2">
                <div className="font-medium">{t("settings.notificationsFields.orderNotifications") || "Order Notifications"}</div>
                {(["email","sms","push"] as const).map((ch) => (
                  <div key={ch} className="flex items-center justify-between p-2 border rounded">
                    <div className="capitalize">{ch}</div>
                    <Switch
                      checked={!!(notifications.orderNotifications as any)?.[ch]}
                      onCheckedChange={(checked) => {
                        setNotifications((p) => ({
                          ...p,
                          orderNotifications: { ...(p.orderNotifications || {}), [ch]: checked },
                        }));
                        markDirty();
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Marketing emails */}
              <div className="p-3 border rounded-lg space-y-2">
                <div className="font-medium">{t("settings.notificationsFields.marketingEmails") || "Marketing Emails"}</div>
                <div className="flex items-center justify-between p-2 border rounded">
                  <div>{t("app.active") || "Enabled"}</div>
                  <Switch
                    checked={!!notifications.marketingEmails?.enabled}
                    onCheckedChange={(checked) => { setNotifications((p) => ({ ...p, marketingEmails: { ...(p.marketingEmails || {}), enabled: checked } })); markDirty(); }}
                  />
                </div>
                {!!notifications.marketingEmails?.enabled && (
                  <div className="space-y-2">
                    <Label>{t("app.actions.update") ? "Frequency" : "Frequency"}</Label>
                    <Select
                      value={notifications.marketingEmails?.frequency || "weekly"}
                      onValueChange={(value) => { setNotifications((p) => ({ ...p, marketingEmails: { ...(p.marketingEmails || {}), frequency: value } })); markDirty(); }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Admin alerts */}
              <div className="p-3 border rounded-lg space-y-2">
                <div className="font-medium">{t("settings.notificationsFields.adminAlerts") || "Admin Alerts"}</div>
                <div className="flex items-center justify-between p-2 border rounded">
                  <div>Low Stock</div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!notifications.adminAlerts?.lowStock?.enabled}
                      onCheckedChange={(checked) => { setNotifications((p) => ({ ...p, adminAlerts: { ...(p.adminAlerts || {}), lowStock: { ...(p.adminAlerts?.lowStock || {}), enabled: checked } } })); markDirty(); }}
                    />
                    {!!notifications.adminAlerts?.lowStock?.enabled && (
                      <Input
                        type="number"
                        className="w-20"
                        value={notifications.adminAlerts?.lowStock?.threshold ?? 0}
                        onChange={(e) => { setNotifications((p) => ({ ...p, adminAlerts: { ...(p.adminAlerts || {}), lowStock: { ...(p.adminAlerts?.lowStock || {}), threshold: parseInt(e.target.value || "0") } } })); markDirty(); }}
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 border rounded">
                  <div>New Orders</div>
                  <Switch
                    checked={!!notifications.adminAlerts?.newOrders?.enabled}
                    onCheckedChange={(checked) => { setNotifications((p) => ({ ...p, adminAlerts: { ...(p.adminAlerts || {}), newOrders: { enabled: checked } } })); markDirty(); }}
                  />
                </div>
                <div className="flex items-center justify-between p-2 border rounded">
                  <div>System Updates</div>
                  <Switch
                    checked={!!notifications.adminAlerts?.systemUpdates?.enabled}
                    onCheckedChange={(checked) => { setNotifications((p) => ({ ...p, adminAlerts: { ...(p.adminAlerts || {}), systemUpdates: { enabled: checked } } })); markDirty(); }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={() => save("notifications")} disabled={!canSave} className="flex items-center gap-2">
              <Save className="w-4 h-4" /> {t("settings.saveNotifications")}
            </Button>
            <Button variant="outline" onClick={() => reset("notifications")} className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> {t("app.actions.reset") || "Reset"}
            </Button>
          </div>
        </TabsContent>

        {/* SYSTEM */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.system")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="mr-3">{t("settings.systemFields.maintenanceMode")}</div>
                  <Switch
                    checked={!!system.maintenanceMode}
                    onCheckedChange={(checked) => {
                      setSystem((p) => ({ ...p, maintenanceMode: checked }));
                      markDirty();
                    }}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="mr-3">{t("settings.systemFields.allowRegistrations")}</div>
                  <Switch
                    checked={!!system.allowRegistrations}
                    onCheckedChange={(checked) => {
                      setSystem((p) => ({ ...p, allowRegistrations: checked }));
                      markDirty();
                    }}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="mr-3">{t("settings.systemFields.requireEmailVerification")}</div>
                  <Switch
                    checked={!!system.requireEmailVerification}
                    onCheckedChange={(checked) => {
                      setSystem((p) => ({ ...p, requireEmailVerification: checked }));
                      markDirty();
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">{t("settings.systemFields.sessionTimeout")}</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={system.sessionTimeout ?? 0}
                    onChange={(e) => {
                      setSystem((p) => ({ ...p, sessionTimeout: parseInt(e.target.value || "0") }));
                      markDirty();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">{t("settings.systemFields.maxLoginAttempts")}</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={system.maxLoginAttempts ?? 0}
                    onChange={(e) => {
                      setSystem((p) => ({ ...p, maxLoginAttempts: parseInt(e.target.value || "0") }));
                      markDirty();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataRetentionDays">{t("settings.systemFields.dataRetentionDays")}</Label>
                  <Input
                    id="dataRetentionDays"
                    type="number"
                    value={system.dataRetentionDays ?? 0}
                    onChange={(e) => {
                      setSystem((p) => ({ ...p, dataRetentionDays: parseInt(e.target.value || "0") }));
                      markDirty();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backupFrequency">{t("settings.systemFields.backupFrequency")}</Label>
                  <Select
                    value={system.backupFrequency || "daily"}
                    onValueChange={(value) => {
                      setSystem((p) => ({ ...p, backupFrequency: value }));
                      markDirty();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t("settings.saveSystem") ? "Daily" : "Daily"}</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">{t("settings.systemFields.timezone")}</Label>
                  {(() => {
                    const zones = [
                      "Africa/Cairo","UTC","Europe/London","Europe/Berlin",
                      "America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
                      "Asia/Dubai","Asia/Riyadh","Asia/Shanghai","Asia/Tokyo"
                    ];
                    const value = system.timezone || "Africa/Cairo";
                    const items = zones.includes(value) ? zones : [value, ...zones];
                    return (
                      <Select
                        value={value}
                        onValueChange={(v) => { setSystem((p) => ({ ...p, timezone: v })); markDirty(); }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((z) => (
                            <SelectItem key={z} value={z}>{z}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  })()}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">{t("settings.systemFields.language")}</Label>
                  <Select
                    value={system.language || "ar"}
                    onValueChange={(v) => { setSystem((p) => ({ ...p, language: v })); markDirty(); }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">Arabic</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">{t("settings.systemFields.currency")}</Label>
                  {(() => {
                    const curr = ["EGP","USD","EUR","GBP","SAR","AED"]; const val = system.currency || "EGP";
                    const items = curr.includes(val) ? curr : [val, ...curr];
                    return (
                      <Select value={val} onValueChange={(v) => { setSystem((p) => ({ ...p, currency: v })); markDirty(); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {items.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={() => save("system")} disabled={!canSave} className="flex items-center gap-2">
              <Save className="w-4 h-4" /> {t("settings.saveSystem")}
            </Button>
            <Button variant="outline" onClick={() => reset("system")} className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> {t("app.actions.reset") || "Reset"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
