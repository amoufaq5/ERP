"use client";

import { useState, useMemo } from "react";
import { useDataStore, type Message } from "@/lib/data-store";
import { useCurrentUser, DEMO_USERS } from "@/lib/user-context";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterBar, type FilterField, type FilterState } from "@/components/shared/filter-bar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Send,
  Plus,
  Star,
  Trash2,
  Reply,
  Inbox,
  Mail,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Map a userId to a display name, falling back to the raw id. */
function userName(userId: string): string {
  const u = DEMO_USERS.find((u) => u.id === userId);
  return u ? u.name : userId;
}

/** Build initials from a display name. */
function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Format an ISO date string to a friendly short form. */
function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ── Folder type ──────────────────────────────────────────────────────────────

type Folder = "inbox" | "sent" | "starred";

// ── Component ────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const store = useDataStore();
  const { user, allUsers } = useCurrentUser();
  const currentUserId = user.id;

  // UI state
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [folder, setFolder] = useState<Folder>("inbox");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [showCompose, setShowCompose] = useState(false);
  const [showReply, setShowReply] = useState(false);

  // ── Derived data ───────────────────────────────────────────────────────────

  const myMessages = useMemo(() => {
    return store.messages.filter(
      (m) => m.toUserId === currentUserId || m.fromUserId === currentUserId
    );
  }, [store.messages, currentUserId]);

  const folderMessages = useMemo(() => {
    switch (folder) {
      case "inbox":
        return myMessages.filter((m) => m.toUserId === currentUserId);
      case "sent":
        return myMessages.filter((m) => m.fromUserId === currentUserId);
      case "starred":
        return myMessages.filter((m) => m.starred);
      default:
        return myMessages;
    }
  }, [myMessages, folder, currentUserId]);

  const filteredMessages = useMemo(() => {
    let list = folderMessages;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.subject.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q) ||
          userName(m.fromUserId).toLowerCase().includes(q) ||
          userName(m.toUserId).toLowerCase().includes(q)
      );
    }
    // sort newest first
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [folderMessages, search]);

  const selectedMessage = useMemo(
    () => store.messages.find((m) => m.id === selectedMessageId) ?? null,
    [store.messages, selectedMessageId]
  );

  const unreadCount = useMemo(
    () => store.messages.filter((m) => m.toUserId === currentUserId && !m.read).length,
    [store.messages, currentUserId]
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  function handleSelectMessage(msg: Message) {
    setSelectedMessageId(msg.id);
    // Mark as read if it is addressed to the current user and unread
    if (msg.toUserId === currentUserId && !msg.read) {
      store.update("messages", msg.id, { read: true });
    }
  }

  function handleStar(id: string) {
    const msg = store.messages.find((m) => m.id === id);
    if (msg) {
      store.update("messages", id, { starred: !msg.starred });
    }
  }

  function handleDelete(id: string) {
    store.remove("messages", id);
    if (selectedMessageId === id) setSelectedMessageId(null);
  }

  // ── Compose form fields ────────────────────────────────────────────────────

  const recipientOptions = allUsers
    .filter((u) => u.id !== currentUserId)
    .map((u) => ({ label: `${u.name} (${u.role})`, value: u.id }));

  const composeFields: EntityField[] = [
    {
      name: "toUserId",
      label: "Recipient",
      type: "select",
      required: true,
      options: recipientOptions,
    },
    { name: "subject", label: "Subject", type: "text", required: true },
    { name: "body", label: "Message", type: "textarea", required: true, fullWidth: true },
  ];

  const replyFields: EntityField[] = [
    {
      name: "toUserId",
      label: "Recipient",
      type: "select",
      required: true,
      options: recipientOptions,
      disabled: true,
    },
    { name: "subject", label: "Subject", type: "text", required: true },
    { name: "body", label: "Message", type: "textarea", required: true, fullWidth: true },
  ];

  // ── DataTable columns ─────────────────────────────────────────────────────

  const columns: Column<Message>[] = [
    {
      key: "starred",
      label: "",
      className: "w-10",
      render: (_val: boolean, row: Message) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleStar(row.id);
          }}
        >
          <Star
            className={`h-4 w-4 ${
              row.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"
            }`}
          />
        </button>
      ),
    },
    {
      key: "fromUserId",
      label: folder === "sent" ? "To" : "From",
      sortable: true,
      className: "w-48",
      render: (_val: string, row: Message) => {
        const displayUserId = folder === "sent" ? row.toUserId : row.fromUserId;
        const name = userName(displayUserId);
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
              {initials(name)}
            </div>
            <span className={`text-sm truncate ${!row.read && row.toUserId === currentUserId ? "font-semibold" : ""}`}>
              {name}
            </span>
          </div>
        );
      },
    },
    {
      key: "subject",
      label: "Subject",
      sortable: true,
      render: (_val: string, row: Message) => (
        <div className="min-w-0">
          <span className={`text-sm ${!row.read && row.toUserId === currentUserId ? "font-semibold" : ""}`}>
            {row.subject}
          </span>
          <p className="text-xs text-muted-foreground truncate max-w-md mt-0.5">
            {row.body.length > 80 ? row.body.slice(0, 80) + "..." : row.body}
          </p>
        </div>
      ),
    },
    {
      key: "read",
      label: "Status",
      className: "w-24",
      render: (_val: boolean, row: Message) => {
        if (row.toUserId !== currentUserId) {
          return <Badge variant="outline" className="text-[10px]">Sent</Badge>;
        }
        return row.read ? (
          <Badge variant="secondary" className="text-[10px]">Read</Badge>
        ) : (
          <Badge variant="default" className="text-[10px]">New</Badge>
        );
      },
    },
    {
      key: "createdAt",
      label: "Date",
      sortable: true,
      className: "w-28",
      render: (val: string) => <span className="text-xs text-muted-foreground">{fmtDate(val)}</span>,
    },
    {
      key: "id",
      label: "",
      className: "w-10",
      render: (_val: string, row: Message) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(row.id);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </button>
      ),
    },
  ];

  // ── Filter bar config ─────────────────────────────────────────────────────

  const filterFields: FilterField[] = [];

  // ── Folder counts ─────────────────────────────────────────────────────────

  const inboxCount = myMessages.filter((m) => m.toUserId === currentUserId).length;
  const sentCount = myMessages.filter((m) => m.fromUserId === currentUserId).length;
  const starredCount = myMessages.filter((m) => m.starred).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Internal messaging and team communication
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowCompose(true)}>
          <Plus className="h-4 w-4" />
          New Message
        </Button>
      </div>

      {/* Main layout */}
      <div className="flex gap-6 min-h-0">
        {/* Sidebar: Folders */}
        <Card className="w-52 shrink-0">
          <CardContent className="p-2 space-y-1">
            {([
              { key: "inbox" as Folder, label: "Inbox", icon: Inbox, count: inboxCount, badge: unreadCount },
              { key: "sent" as Folder, label: "Sent", icon: Send, count: sentCount, badge: 0 },
              { key: "starred" as Folder, label: "Starred", icon: Star, count: starredCount, badge: 0 },
            ]).map((f) => (
              <button
                key={f.key}
                onClick={() => { setFolder(f.key); setSelectedMessageId(null); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  folder === f.key
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <f.icon className="h-4 w-4" />
                <span className="flex-1 text-left">{f.label}</span>
                {f.badge > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    {f.badge}
                  </Badge>
                )}
                {f.badge === 0 && f.count > 0 && (
                  <span className="text-xs text-muted-foreground">{f.count}</span>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Right side: table + detail */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Search */}
          <FilterBar
            searchPlaceholder="Search messages..."
            searchValue={search}
            onSearchChange={setSearch}
            fields={filterFields}
            values={filters}
            onChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
          />

          {/* Detail pane (if a message is selected) */}
          {selectedMessage ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                      {initials(userName(selectedMessage.fromUserId))}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        {userName(selectedMessage.fromUserId)}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        To: {userName(selectedMessage.toUserId)} &middot; {fmtDate(selectedMessage.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleStar(selectedMessage.id)}
                      title={selectedMessage.starred ? "Unstar" : "Star"}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          selectedMessage.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                        }`}
                      />
                    </Button>
                    {selectedMessage.fromUserId !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => setShowReply(true)}
                      >
                        <Reply className="h-4 w-4" />
                        Reply
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(selectedMessage.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs ml-2"
                      onClick={() => setSelectedMessageId(null)}
                    >
                      Back to list
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold mb-3">{selectedMessage.subject}</h3>
                <p className="text-sm whitespace-pre-line leading-relaxed text-foreground/80">
                  {selectedMessage.body}
                </p>
              </CardContent>
            </Card>
          ) : (
            /* Message table */
            <DataTable<Message>
              columns={columns}
              data={filteredMessages}
              onRowClick={handleSelectMessage}
              emptyMessage="No messages in this folder."
              pagination
            />
          )}
        </div>
      </div>

      {/* Compose modal */}
      <EntityFormModal
        open={showCompose}
        onOpenChange={setShowCompose}
        title="New Message"
        description="Send a message to a team member"
        fields={composeFields}
        submitLabel="Send"
        onSubmit={(data) => {
          const msg: Message = {
            id: store.genId("msg"),
            fromUserId: currentUserId,
            toUserId: data.toUserId as string,
            subject: data.subject as string,
            body: data.body as string,
            read: false,
            starred: false,
            createdAt: new Date().toISOString(),
          };
          store.add("messages", msg);
        }}
      />

      {/* Reply modal */}
      {selectedMessage && (
        <EntityFormModal
          open={showReply}
          onOpenChange={setShowReply}
          title="Reply"
          description={`Replying to ${userName(selectedMessage.fromUserId)}`}
          fields={replyFields}
          initialData={{
            toUserId: selectedMessage.fromUserId,
            subject: selectedMessage.subject.startsWith("Re: ")
              ? selectedMessage.subject
              : `Re: ${selectedMessage.subject}`,
            body: "",
          }}
          submitLabel="Send Reply"
          onSubmit={(data) => {
            const msg: Message = {
              id: store.genId("msg"),
              fromUserId: currentUserId,
              toUserId: data.toUserId as string,
              subject: data.subject as string,
              body: data.body as string,
              read: false,
              starred: false,
              createdAt: new Date().toISOString(),
            };
            store.add("messages", msg);
          }}
        />
      )}
    </div>
  );
}
