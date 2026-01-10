import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { ScrollArea } from "../../ui/scroll-area";
import { Textarea } from "../../ui/textarea";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { EmptyState } from "../common/EmptyState";
import { ErrorState } from "../common/ErrorState";
import {
  fetchWhatsappConversations,
  fetchWhatsappLogs,
  fetchWhatsappMessages,
  formatWhatsappStatus,
  sendWhatsappReply,
  toWhatsappTemplateName,
  type WhatsappConversation,
  type WhatsappMessage,
  type WhatsappLogStatus,
} from "../../../services/whatsapp.service";
import { getAdminErrorMessage } from "../../../lib/errors";
import { usePermissions } from "../../../auth/permissions";
import { useDebounce } from "../../../hooks/useDebounce";
import { maskPhone } from "../../../lib/pii";
import { redactPhoneNumbers, redactSensitiveText } from "../../../lib/redaction";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";

const DELIVERY_BADGE: Record<string, string> = {
  QUEUED: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  READ: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

const CONVERSATION_BADGE: Record<string, string> = {
  OPEN: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-700",
};

type ReplyContext = {
  allowFreeform: boolean;
  windowEndsAt?: string | null;
  lastInboundAt?: string | null;
};

function resolveReplyContext(conversation: WhatsappConversation | null, messages: WhatsappMessage[]): ReplyContext {
  if (!conversation) return { allowFreeform: false };
  const metadata = (conversation.metadata ?? {}) as Record<string, any>;
  const explicitAllow =
    typeof metadata.canReply === "boolean"
      ? metadata.canReply
      : typeof metadata.allowFreeform === "boolean"
        ? metadata.allowFreeform
        : typeof metadata.within24h === "boolean"
          ? metadata.within24h
          : undefined;
  const windowEndsAt =
    metadata.replyWindowEndsAt ??
    metadata.replyWindowExpiresAt ??
    metadata.windowExpiresAt ??
    metadata.freeformUntil ??
    null;

  const inbound = messages
    .filter((msg) => String(msg.direction).toUpperCase() === "INBOUND")
    .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())[0];
  const lastInboundAt = inbound?.createdAt ?? null;
  const computedWindowEndsAt = lastInboundAt ? dayjs(lastInboundAt).add(24, "hour").toISOString() : null;
  const finalWindowEndsAt = windowEndsAt ?? computedWindowEndsAt;
  const allowByWindow = finalWindowEndsAt ? dayjs().isBefore(dayjs(finalWindowEndsAt)) : false;
  const allowFreeform = explicitAllow ?? allowByWindow;
  return { allowFreeform, windowEndsAt: finalWindowEndsAt, lastInboundAt };
}

function messageLabel(message: WhatsappMessage) {
  const type = String(message.messageType || "TEXT").toUpperCase();
  if (type !== "TEXT") return type.replace(/_/g, " ");
  return "TEXT";
}

export function WhatsAppInbox() {
  const { t } = useTranslation();
  const perms = usePermissions();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageLimit, setMessageLimit] = useState(50);
  const [replyText, setReplyText] = useState("");
  const [templateChoice, setTemplateChoice] = useState<string>("none");
  const [customTemplate, setCustomTemplate] = useState("");
  const [templateVariables, setTemplateVariables] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const conversationsQuery = useQuery({
    queryKey: ["whatsapp-conversations", { search: debouncedSearch, status, page }],
    queryFn: () =>
      fetchWhatsappConversations({
        search: debouncedSearch || undefined,
        status: status === "all" ? undefined : (status as any),
        page,
        pageSize,
      }),
    enabled: perms.canViewSupport,
    keepPreviousData: true,
  });

  const conversations = conversationsQuery.data?.items || [];
  const total = conversationsQuery.data?.total || 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (!conversations.length) {
      setSelectedConversationId(null);
      return;
    }
    if (!selectedConversationId || !conversations.find((conv) => conv.id === selectedConversationId)) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const selectedConversation =
    conversations.find((conv) => conv.id === selectedConversationId) ?? null;

  const messagesQuery = useQuery({
    queryKey: ["whatsapp-messages", selectedConversationId, messageLimit],
    queryFn: () =>
      fetchWhatsappMessages(selectedConversationId!, { page: 1, pageSize: messageLimit }),
    enabled: perms.canViewSupport && Boolean(selectedConversationId),
  });

  const messages = messagesQuery.data?.items || [];
  const messageTotal = messagesQuery.data?.total || 0;
  const orderedMessages = useMemo(() => [...messages].sort((a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf()), [messages]);

  const logsQuery = useQuery({
    queryKey: ["whatsapp-message-logs", selectedConversationId],
    queryFn: () =>
      fetchWhatsappLogs({
        supportConversationId: selectedConversationId!,
        page: 1,
        pageSize: 100,
      }),
    enabled: perms.canViewSupport && Boolean(selectedConversationId),
  });

  const messageStatusMap = useMemo(() => {
    const map = new Map<string, { status: string | null; errorMessage?: string | null }>();
    (logsQuery.data?.items || []).forEach((log) => {
      if (log.supportMessageId) {
        map.set(log.supportMessageId, { status: log.status ?? null, errorMessage: log.errorMessage ?? null });
      }
    });
    return map;
  }, [logsQuery.data?.items]);

  const templatesQuery = useQuery({
    queryKey: ["whatsapp-template-options"],
    queryFn: () => fetchWhatsappLogs({ page: 1, pageSize: 60 }),
    enabled: perms.canViewSupport,
    staleTime: 60_000,
  });

  const templateOptions = useMemo(() => {
    const options = new Set<string>();
    const metadataOptions = (selectedConversation?.metadata as any)?.templates;
    if (Array.isArray(metadataOptions)) {
      metadataOptions.forEach((item: string) => {
        const name = toWhatsappTemplateName(item);
        if (name) options.add(name);
      });
    }
    (logsQuery.data?.items || []).forEach((log) => {
      const name = toWhatsappTemplateName(log.templateName);
      if (name) options.add(name);
    });
    (templatesQuery.data?.items || []).forEach((log) => {
      const name = toWhatsappTemplateName(log.templateName);
      if (name) options.add(name);
    });
    return Array.from(options).sort();
  }, [logsQuery.data?.items, selectedConversation?.metadata, templatesQuery.data?.items]);

  const replyContext = useMemo(
    () => resolveReplyContext(selectedConversation, messages),
    [selectedConversation, messages]
  );

  const replyMutation = useMutation({
    mutationFn: (payload: { conversationId: string } & Parameters<typeof sendWhatsappReply>[1]) => {
      const { conversationId, ...body } = payload;
      return sendWhatsappReply(conversationId, body);
    },
    onSuccess: () => {
      toast.success(t("whatsapp.reply_sent", "Reply sent"));
      setReplyText("");
      setTemplateVariables("");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-message-logs", selectedConversationId] });
    },
    onError: (error) => {
      toast.error(getAdminErrorMessage(error, t, t("whatsapp.reply_failed", "Failed to send reply")));
    },
  });

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [selectedConversationId, orderedMessages.length]);

  if (!perms.canViewSupport) {
    return <ErrorState message={t("support.permission", "You do not have access to support tools.")} />;
  }

  const masked = (value?: string | null, maskedValue?: string | null) =>
    perms.canViewPII ? value || "" : maskedValue || maskPhone(value || "");
  const sanitizeText = (value: string) => {
    const redacted = redactSensitiveText(value);
    return perms.canViewPII ? redacted : redactPhoneNumbers(redacted);
  };

  const handleSend = () => {
    if (!selectedConversationId) return;
    if (replyContext.allowFreeform) {
      const trimmed = replyText.trim();
      if (!trimmed) return;
      replyMutation.mutate({ conversationId: selectedConversationId, type: "TEXT", text: trimmed });
      return;
    }
    const baseTemplate =
      templateChoice === "custom" ? customTemplate.trim() : templateChoice === "none" ? "" : templateChoice.trim();
    if (!baseTemplate) {
      toast.error(t("whatsapp.template_required", "Select a template to continue"));
      return;
    }
    let variables: Record<string, any> | undefined;
    if (templateVariables.trim()) {
      try {
        const parsed = JSON.parse(templateVariables);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("invalid");
        }
        variables = parsed as Record<string, any>;
      } catch {
        toast.error(t("whatsapp.template_variables_invalid", "Template variables must be valid JSON"));
        return;
      }
    }
    replyMutation.mutate({
      conversationId: selectedConversationId,
      type: "TEMPLATE",
      templateName: baseTemplate,
      variables,
    });
  };

  const replyWindowLabel = replyContext.allowFreeform
    ? replyContext.windowEndsAt
      ? t("whatsapp.reply_window_until", {
          defaultValue: "Freeform window until {{time}}",
          time: dayjs(replyContext.windowEndsAt).format("DD MMM YYYY HH:mm"),
        })
      : t("whatsapp.reply_window_open", "Freeform window is open")
    : t("whatsapp.reply_window_closed", "Freeform window closed. Use templates.");

  const conversationHeaderName =
    selectedConversation?.displayName || selectedConversation?.phone || t("whatsapp.unknown_user", "Unknown");
  const conversationStatus = String(selectedConversation?.status || "OPEN").toUpperCase();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            {t("whatsapp.inbox_title", "WhatsApp Inbox")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("whatsapp.inbox_subtitle", "Manage WhatsApp customer conversations")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => conversationsQuery.refetch()}>
          {t("common.refresh", "Refresh")}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px,1fr] gap-4">
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-sm">{t("whatsapp.conversations", "Conversations")}</CardTitle>
            <Input
              placeholder={t("whatsapp.search_placeholder", "Search phone or message")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder={t("whatsapp.status", "Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                <SelectItem value="OPEN">{t("whatsapp.status_open", "Open")}</SelectItem>
                <SelectItem value="CLOSED">{t("whatsapp.status_closed", "Closed")}</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            {conversationsQuery.isLoading ? (
              <div className="p-4">
                <AdminTableSkeleton rows={6} columns={1} />
              </div>
            ) : conversationsQuery.isError ? (
              <ErrorState
                message={getAdminErrorMessage(conversationsQuery.error, t)}
                onRetry={() => conversationsQuery.refetch()}
              />
            ) : !conversations.length ? (
              <div className="p-4">
                <EmptyState title={t("whatsapp.no_conversations", "No conversations found")} />
              </div>
            ) : (
              <>
                <ScrollArea className="h-[520px]">
                  <div className="divide-y">
                    {conversations.map((conv) => {
                      const displayName =
                        conv.displayName || masked(conv.phone, conv.maskedPhone) || t("whatsapp.unknown_user", "Unknown");
                      const preview = sanitizeText(conv.lastMessagePreview || "") || t("whatsapp.no_preview", "No messages yet");
                      const timestamp = conv.lastMessageAt ? dayjs(conv.lastMessageAt).format("DD MMM HH:mm") : "";
                      const active = conv.id === selectedConversationId;
                      const statusKey = String(conv.status || "OPEN").toUpperCase();
                      const statusLabel = formatWhatsappStatus(statusKey) || statusKey;
                      return (
                        <button
                          key={conv.id}
                          className={[
                            "w-full text-left px-4 py-3 hover:bg-muted transition",
                            active ? "bg-muted" : "bg-transparent",
                          ].join(" ")}
                          onClick={() => setSelectedConversationId(conv.id)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{displayName}</p>
                              <p className="text-xs text-muted-foreground truncate" dir="auto">
                                {preview}
                              </p>
                            </div>
                            <div className="text-right space-y-1">
                              <p className="text-xs text-muted-foreground">{timestamp}</p>
                              <Badge variant="outline" className={CONVERSATION_BADGE[statusKey] || CONVERSATION_BADGE.OPEN}>
                                {statusLabel}
                              </Badge>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
                <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
                  <span>
                    {t("common.pagination.label", {
                      defaultValue: "Page {{page}} of {{count}}",
                      page,
                      count: pageCount,
                    })}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    >
                      {t("common.prev", "Prev")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= pageCount}
                      onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                    >
                      {t("common.next", "Next")}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col min-h-[520px]">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{t("whatsapp.conversation", "Conversation")}</CardTitle>
              {selectedConversation && (
                <Badge variant="outline" className={CONVERSATION_BADGE[conversationStatus] || CONVERSATION_BADGE.OPEN}>
                  {formatWhatsappStatus(conversationStatus) || conversationStatus}
                </Badge>
              )}
            </div>
            {selectedConversation ? (
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{conversationHeaderName}</p>
                <p>{masked(selectedConversation.phone, selectedConversation.maskedPhone)}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("whatsapp.select_conversation", "Select a conversation to view messages")}
              </p>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3">
            {messagesQuery.isLoading ? (
              <AdminTableSkeleton rows={5} columns={1} />
            ) : messagesQuery.isError ? (
              <ErrorState
                message={getAdminErrorMessage(messagesQuery.error, t, t("whatsapp.messages_error", "Failed to load messages"))}
                onRetry={() => messagesQuery.refetch()}
              />
            ) : !selectedConversation ? (
              <EmptyState title={t("whatsapp.no_conversation_selected", "No conversation selected")} />
            ) : orderedMessages.length === 0 ? (
              <EmptyState title={t("whatsapp.no_messages", "No messages yet")} />
            ) : (
              <ScrollArea className="h-[360px] pr-2">
                <div className="space-y-3">
                  {messageTotal > messageLimit && (
                    <div className="flex justify-center">
                      <Button variant="ghost" size="sm" onClick={() => setMessageLimit((prev) => prev + 50)}>
                        {t("whatsapp.load_older", "Load older messages")}
                      </Button>
                    </div>
                  )}
                  {orderedMessages.map((message) => {
                    const outbound = String(message.direction).toUpperCase() === "OUTBOUND";
                    const statusInfo = messageStatusMap.get(message.id);
                    const status =
                      (message.status as WhatsappLogStatus | string | null) ??
                      statusInfo?.status ??
                      null;
                    const statusKey = status ? String(status).toUpperCase() : "";
                    const statusLabel =
                      formatWhatsappStatus(statusKey) ||
                      statusKey ||
                      t("whatsapp.status_unknown", "Unknown");
                    const badgeClass = statusKey ? DELIVERY_BADGE[statusKey] || "bg-gray-100 text-gray-700" : "bg-gray-100 text-gray-700";
                    const body = sanitizeText(message.body || "") || t("whatsapp.message_empty", "No text");
                    return (
                      <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                        <div
                          className={[
                            "max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm",
                            outbound ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                          ].join(" ")}
                        >
                          <p dir="auto" className="whitespace-pre-wrap break-words">
                            {body}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] opacity-80">
                            <span>{dayjs(message.createdAt).format("DD MMM HH:mm")}</span>
                            <span>{messageLabel(message)}</span>
                          </div>
                          {outbound && (
                            <div className="mt-2">
                              <Badge variant="outline" className={badgeClass}>
                                {statusLabel}
                              </Badge>
                              {statusInfo?.errorMessage && (
                                <p className="text-[11px] mt-1 opacity-80">
                                  {sanitizeText(statusInfo.errorMessage)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>
            )}

            {selectedConversation && (
              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{replyWindowLabel}</span>
                  {replyContext.lastInboundAt && (
                    <span>
                      {t("whatsapp.last_inbound", { defaultValue: "Last inbound: {{time}}", time: dayjs(replyContext.lastInboundAt).format("DD MMM HH:mm") })}
                    </span>
                  )}
                </div>

                {replyContext.allowFreeform ? (
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={t("whatsapp.reply_placeholder", "Type a reply...")}
                    className="min-h-[90px]"
                    disabled={replyMutation.isPending}
                  />
                ) : (
                  <div className="space-y-2">
                    <Select
                      value={templateChoice}
                      onValueChange={(value) => setTemplateChoice(value)}
                      disabled={replyMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("whatsapp.template_select", "Select template")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("whatsapp.template_select", "Select template")}</SelectItem>
                        {templateOptions.map((template) => (
                          <SelectItem key={template} value={template}>
                            {template}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">{t("whatsapp.template_custom", "Custom template")}</SelectItem>
                      </SelectContent>
                    </Select>
                    {templateChoice === "custom" && (
                      <Input
                        value={customTemplate}
                        onChange={(e) => setCustomTemplate(e.target.value)}
                        placeholder={t("whatsapp.template_custom_placeholder", "Enter template name")}
                        disabled={replyMutation.isPending}
                      />
                    )}
                    <Textarea
                      value={templateVariables}
                      onChange={(e) => setTemplateVariables(e.target.value)}
                      placeholder={t("whatsapp.template_variables", "Template variables (JSON)")}
                      className="min-h-[90px]"
                      disabled={replyMutation.isPending}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  {replyMutation.isError && (
                    <p className="text-xs text-red-600">
                      {getAdminErrorMessage(replyMutation.error, t, t("whatsapp.reply_failed", "Failed to send reply"))}
                    </p>
                  )}
                  <Button
                    onClick={handleSend}
                    disabled={
                      replyMutation.isPending ||
                      (replyContext.allowFreeform
                        ? !replyText.trim()
                        : templateChoice === "none" || (templateChoice === "custom" && !customTemplate.trim()))
                    }
                    className="ml-auto"
                  >
                    {replyMutation.isPending ? t("common.sending", "Sending...") : t("whatsapp.send", "Send")}
                    <Send className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
