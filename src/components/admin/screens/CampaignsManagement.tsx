import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { createCampaign, emitCampaign, listCampaigns, updateCampaign } from "../../../services/campaigns.service";
import type { CampaignChannel, CampaignStatus } from "../../../types/campaign";
import { toast } from "sonner";

const STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  SENT: "Sent",
  CANCELED: "Canceled",
};

const CHANNEL_LABELS: Record<CampaignChannel, string> = {
  PUSH: "Push",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
};

export function CampaignsManagement() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "all">("all");
  const [channelFilter, setChannelFilter] = useState<CampaignChannel | "all">("all");
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<CampaignChannel>("PUSH");

  const query = useQuery({
    queryKey: ["campaigns", { page, pageSize, statusFilter, channelFilter, search }],
    queryFn: () =>
      listCampaigns({
        page,
        pageSize,
        status: statusFilter === "all" ? undefined : statusFilter,
        channel: channelFilter === "all" ? undefined : channelFilter,
        q: search.trim() || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createCampaign({
        name: name.trim(),
        title: title.trim() || undefined,
        message: message.trim(),
        channel,
      }),
    onSuccess: () => {
      toast.success(t("campaigns.created", "Campaign created"));
      setName("");
      setTitle("");
      setMessage("");
      query.refetch();
    },
    onError: () => toast.error(t("campaigns.create_failed", "Failed to create campaign")),
  });

  const emitMutation = useMutation({
    mutationFn: (id: string) => emitCampaign(id),
    onSuccess: () => {
      toast.success(t("campaigns.sent", "Campaign sent"));
      query.refetch();
    },
    onError: () => toast.error(t("campaigns.send_failed", "Failed to send campaign")),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => updateCampaign(id, { status: "CANCELED" }),
    onSuccess: () => {
      toast.success(t("campaigns.canceled", "Campaign canceled"));
      query.refetch();
    },
    onError: () => toast.error(t("campaigns.cancel_failed", "Failed to cancel campaign")),
  });

  const rows = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const canCreate = name.trim().length >= 3 && message.trim().length >= 5;

  const statusBadge = (status: CampaignStatus) => {
    if (status === "SENT") return "default";
    if (status === "CANCELED") return "destructive";
    return "outline";
  };

  const nextPage = () => setPage((prev) => Math.min(prev + 1, totalPages));
  const prevPage = () => setPage((prev) => Math.max(prev - 1, 1));

  return (
    <div className="space-y-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("campaigns.title", "Campaigns")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Input
            placeholder={t("campaigns.name", "Campaign name")}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            placeholder={t("campaigns.title_field", "Title (optional)")}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Select value={channel} onValueChange={(value) => setChannel(value as CampaignChannel)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!canCreate || createMutation.isPending}
          >
            {createMutation.isPending ? t("common.saving", "Saving...") : t("campaigns.create", "Create")}
          </Button>
          <div className="md:col-span-4">
            <Input
              placeholder={t("campaigns.message", "Message")}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>{t("campaigns.list", "Campaign list")}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder={t("campaigns.search", "Search")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-48"
            />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("campaigns.status", "Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("campaigns.all", "All")}</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={(value) => setChannelFilter(value as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("campaigns.channel", "Channel")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("campaigns.all", "All")}</SelectItem>
                {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("campaigns.name", "Name")}</TableHead>
                <TableHead>{t("campaigns.channel", "Channel")}</TableHead>
                <TableHead>{t("campaigns.status", "Status")}</TableHead>
                <TableHead>{t("campaigns.created", "Created")}</TableHead>
                <TableHead className="text-right">{t("campaigns.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div className="font-medium">{campaign.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{campaign.message}</div>
                  </TableCell>
                  <TableCell>{CHANNEL_LABELS[campaign.channel]}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadge(campaign.status)}>{STATUS_LABELS[campaign.status]}</Badge>
                  </TableCell>
                  <TableCell>{new Date(campaign.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => emitMutation.mutate(campaign.id)}
                        disabled={emitMutation.isPending || campaign.status === "SENT"}
                      >
                        {t("campaigns.send", "Send")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cancelMutation.mutate(campaign.id)}
                        disabled={cancelMutation.isPending || campaign.status === "CANCELED"}
                      >
                        {t("campaigns.cancel", "Cancel")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    {t("campaigns.empty", "No campaigns yet")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">
              {t("campaigns.page", { defaultValue: `Page ${page} of ${totalPages}` })}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={prevPage} disabled={page <= 1}>
                {t("common.prev", "Prev")}
              </Button>
              <Button size="sm" variant="outline" onClick={nextPage} disabled={page >= totalPages}>
                {t("common.next", "Next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
