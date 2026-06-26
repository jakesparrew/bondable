import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bot,
  MessageSquare,
  Search,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import {
  adminService,
  type AdminConversation,
  type ChatMessage,
} from "@/services/api/adminService";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatTime(iso: string, locale?: string): string {
  try {
    return new Date(iso).toLocaleString(locale || undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function snippet(conv: AdminConversation): string {
  const last = conv.messages[conv.messages.length - 1];
  return last ? last.text : "";
}

type FilterType = "all" | "bond" | "direct";

/* -------------------------------------------------------------------------- */
/* Message bubble                                                              */
/* -------------------------------------------------------------------------- */

const MessageBubble = ({ msg }: { msg: ChatMessage }) => {
  const { t } = useTranslation();

  if (msg.sender === "system") {
    return (
      <div className="my-3 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-center text-xs font-medium text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
          {msg.text}
        </span>
      </div>
    );
  }

  const isClient = msg.sender === "client";
  const isBond = msg.sender === "bond";

  // Bond/AI bubbles are the ONLY mint usage in the app.
  const bubbleClass = isClient
    ? "bg-secondary text-secondary-foreground"
    : isBond
    ? "bg-mint text-mint-foreground"
    : "border border-border bg-card text-foreground";

  const senderLabel = isClient
    ? t("admin_chat_sender_client", "Cliënt")
    : isBond
    ? t("admin_chat_sender_bond", "Bond (AI)")
    : t("admin_chat_sender_therapist", "Hulpverlener");

  return (
    <div className={`flex flex-col ${isClient ? "items-end" : "items-start"}`}>
      <span className="mb-1 px-1 text-[11px] font-medium text-muted-foreground">
        {senderLabel}
      </span>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${bubbleClass}`}
      >
        {msg.text}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Transcript                                                                  */
/* -------------------------------------------------------------------------- */

const Transcript = ({ conv }: { conv: AdminConversation }) => {
  const { t, i18n } = useTranslation();
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-foreground">{conv.clientName}</h3>
          <span className="text-xs text-muted-foreground">↔ {conv.counterpartName}</span>
          <Badge variant={conv.type === "bond" ? "secondary" : "outline"}>
            {conv.type === "bond"
              ? t("admin_chat_type_bond", "Bond (AI)")
              : t("admin_chat_type_direct", "Direct")}
          </Badge>
          {conv.status === "flagged" && (
            <Badge variant="destructive">
              {t("admin_chat_flagged", "Gemarkeerd")}
            </Badge>
          )}
        </div>
        {conv.supervisingTherapistName && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("admin_chat_supervised_by", "Onder supervisie van")}{" "}
            <span className="font-medium text-foreground">
              {conv.supervisingTherapistName}
            </span>
          </p>
        )}
      </div>
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-3 py-4">
          {conv.messages.map((m) => (
            <MessageBubble key={m.id} msg={m} />
          ))}
        </div>
      </ScrollArea>
      <div className="border-t border-border px-4 py-2.5 text-center text-[11px] text-muted-foreground">
        {t(
          "admin_chat_readonly",
          "Alleen-lezen toezicht — laatste bericht",
        )}{" "}
        {formatTime(conv.lastMessageAt, i18n.language)}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Conversation list row                                                       */
/* -------------------------------------------------------------------------- */

const ConversationRow = ({
  conv,
  active,
  onSelect,
}: {
  conv: AdminConversation;
  active: boolean;
  onSelect: () => void;
}) => {
  const { t, i18n } = useTranslation();
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
        active
          ? "border-primary bg-accent"
          : "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
      }`}
    >
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="bg-secondary text-xs text-primary">
          {initials(conv.clientName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {conv.clientName}
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatTime(conv.lastMessageAt, i18n.language)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {conv.type === "bond" ? (
            <Bot className="h-3 w-3 shrink-0" aria-hidden="true" />
          ) : (
            <UserRound className="h-3 w-3 shrink-0" aria-hidden="true" />
          )}
          <span className="truncate">{conv.counterpartName}</span>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {snippet(conv)}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant={conv.type === "bond" ? "secondary" : "outline"} className="text-[10px]">
            {conv.type === "bond"
              ? t("admin_chat_type_bond", "Bond (AI)")
              : t("admin_chat_type_direct", "Direct")}
          </Badge>
          {conv.status === "flagged" && (
            <Badge variant="destructive" className="text-[10px]">
              {t("admin_chat_flagged", "Gemarkeerd")}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

const AdminAllChats = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [filterType, setFilterType] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminService
      .listConversations()
      .then((rows) => {
        if (!alive) return;
        setConversations(rows);
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filterType !== "all" && c.type !== filterType) return false;
      if (flaggedOnly && c.status !== "flagged") return false;
      if (q) {
        const haystack = [
          c.clientName,
          c.counterpartName,
          c.supervisingTherapistName ?? "",
          ...c.messages.map((m) => m.text),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [conversations, filterType, flaggedOnly, search]);

  const selected = useMemo(
    () => filtered.find((c) => c.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (isMobile) setDialogOpen(true);
  };

  const tabs: { key: FilterType; label: string }[] = [
    { key: "all", label: t("admin_chat_tab_all", "Alle") },
    { key: "bond", label: t("admin_chat_tab_bond", "Bond (AI)") },
    { key: "direct", label: t("admin_chat_tab_direct", "Direct") },
  ];

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {t("admin_chats_title", "Alle gesprekken")}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t(
              "admin_chats_subtitle",
              "Platformtoezicht op AI-gesprekken (Bond) en directe chats met hulpverleners, onder supervisie van een hulpverlener.",
            )}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterType(tab.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filterType === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={flaggedOnly ? "destructive" : "outline"}
              size="sm"
              onClick={() => setFlaggedOnly((v) => !v)}
              className="gap-1.5"
            >
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              {t("admin_chat_flagged_only", "Alleen gemarkeerd")}
            </Button>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("admin_chat_search", "Zoek gesprekken…")}
                className="w-full pl-8 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Two-pane (lg) / list + dialog (mobile) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Conversation list */}
          <div className="lg:col-span-5 xl:col-span-4">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
                  {t("admin_chat_list_title", "Gesprekken")}
                  {!loading && (
                    <Badge variant="secondary" className="ml-auto">
                      {filtered.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-xl" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">
                      {t("admin_chat_empty", "Geen gesprekken gevonden.")}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[60vh] pr-2">
                    <div className="space-y-2">
                      {filtered.map((conv) => (
                        <ConversationRow
                          key={conv.id}
                          conv={conv}
                          active={!isMobile && conv.id === selectedId}
                          onSelect={() => handleSelect(conv.id)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Transcript viewer (desktop) */}
          <div className="hidden lg:col-span-7 lg:block xl:col-span-8">
            <Card className="h-full min-h-[60vh]">
              {selected ? (
                <Transcript conv={selected} />
              ) : (
                <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
                    <MessageSquare className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {t("admin_chat_select_prompt", "Selecteer een gesprek")}
                  </p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    {t(
                      "admin_chat_select_hint",
                      "Kies links een gesprek om het volledige, alleen-lezen transcript te bekijken.",
                    )}
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile transcript dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] gap-0 p-0 sm:max-w-lg">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-sm">
              {selected?.clientName ?? t("admin_chat_transcript", "Transcript")}
            </DialogTitle>
          </DialogHeader>
          <Separator className="mt-2" />
          {selected && (
            <div className="h-[70vh]">
              <Transcript conv={selected} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminAllChats;
