"use client";

import { useState } from "react";
import { EntityFormModal, type EntityField } from "@/components/shared/entity-form-modal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Search,
  Send,
  Plus,
  Star,
  Archive,
  Trash2,
  Paperclip,
  Users,
  Clock,
  Check,
  CheckCheck,
} from "lucide-react";

interface Message {
  id: string;
  sender: string;
  avatar: string;
  subject: string;
  preview: string;
  time: string;
  unread: boolean;
  starred: boolean;
  channel: string;
}

interface Conversation {
  id: string;
  messages: {
    sender: string;
    content: string;
    time: string;
    isMe: boolean;
    status: "sent" | "delivered" | "read";
  }[];
}

const messagesData: Message[] = [
  {
    id: "1",
    sender: "Sarah Johnson",
    avatar: "SJ",
    subject: "Q1 Financial Report Review",
    preview: "Hi team, I've completed the Q1 financial report. Please review the attached document and share your feedback by EOD Friday.",
    time: "10:32 AM",
    unread: true,
    starred: true,
    channel: "Finance",
  },
  {
    id: "2",
    sender: "DevOps Team",
    avatar: "DT",
    subject: "Server Migration Update",
    preview: "The database migration to the new cluster has been completed successfully. All services are back online.",
    time: "9:15 AM",
    unread: true,
    starred: false,
    channel: "Engineering",
  },
  {
    id: "3",
    sender: "Marcus Chen",
    avatar: "MC",
    subject: "New Candidate Pipeline",
    preview: "We've received 45 new applications for the Senior Developer position. I've shortlisted 12 for initial screening.",
    time: "Yesterday",
    unread: false,
    starred: false,
    channel: "Hiring",
  },
  {
    id: "4",
    sender: "Priya Nair",
    avatar: "PN",
    subject: "Client Onboarding - Acme Corp",
    preview: "The onboarding process for Acme Corp is progressing well. They've completed the initial setup and are now in the training phase.",
    time: "Yesterday",
    unread: false,
    starred: true,
    channel: "CRM",
  },
  {
    id: "5",
    sender: "Lisa Park",
    avatar: "LP",
    subject: "Employee Benefits Update",
    preview: "Please review the updated benefits package for 2026. We've added dental coverage and increased the wellness stipend.",
    time: "Apr 1",
    unread: false,
    starred: false,
    channel: "HR",
  },
  {
    id: "6",
    sender: "Operations",
    avatar: "OP",
    subject: "Warehouse Inventory Alert",
    preview: "Stock levels for SKU-2847 have fallen below the minimum threshold. Please initiate a reorder.",
    time: "Apr 1",
    unread: false,
    starred: false,
    channel: "Inventory",
  },
  {
    id: "7",
    sender: "Jordan Mitchell",
    avatar: "JM",
    subject: "Sprint Retrospective Notes",
    preview: "Here are the action items from yesterday's retrospective. Top priority: improve CI/CD pipeline speed.",
    time: "Mar 31",
    unread: false,
    starred: false,
    channel: "Engineering",
  },
  {
    id: "8",
    sender: "Amara Osei",
    avatar: "AO",
    subject: "Design System v3 Proposal",
    preview: "I've put together a proposal for updating our design system. Key changes include new color tokens and spacing scales.",
    time: "Mar 30",
    unread: false,
    starred: true,
    channel: "Design",
  },
];

const conversationData: Conversation = {
  id: "1",
  messages: [
    {
      sender: "Sarah Johnson",
      content: "Hi team, I've completed the Q1 financial report. Please review the attached document and share your feedback by EOD Friday.",
      time: "10:32 AM",
      isMe: false,
      status: "read",
    },
    {
      sender: "Sarah Johnson",
      content: "Key highlights:\n- Revenue up 12.5% QoQ\n- Operating margins improved to 23%\n- Customer acquisition cost decreased by 8%",
      time: "10:33 AM",
      isMe: false,
      status: "read",
    },
    {
      sender: "You",
      content: "Thanks Sarah, I'll review it this afternoon. The margin improvement looks promising.",
      time: "10:45 AM",
      isMe: true,
      status: "read",
    },
    {
      sender: "Sarah Johnson",
      content: "Great! Also, I've flagged a few items that need CFO approval on page 12. Let me know if you have questions.",
      time: "10:48 AM",
      isMe: false,
      status: "read",
    },
  ],
};

const channels = ["All", "Finance", "Engineering", "Hiring", "CRM", "HR", "Inventory", "Design"];

const messageFields: EntityField[] = [
  { key: "recipient", label: "Recipient", type: "text", required: true },
  { key: "subject", label: "Subject", type: "text", required: true },
  { key: "channel", label: "Channel", type: "select", options: [
    { label: "Finance", value: "Finance" }, { label: "Engineering", value: "Engineering" },
    { label: "Hiring", value: "Hiring" }, { label: "CRM", value: "CRM" },
    { label: "HR", value: "HR" }, { label: "Inventory", value: "Inventory" },
    { label: "Design", value: "Design" },
  ]},
  { key: "message", label: "Message", type: "textarea", required: true },
];

export default function MessagesPage() {
  const [selectedMessageId, setSelectedMessageId] = useState<string>("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChannel, setActiveChannel] = useState("All");
  const [composeMessage, setComposeMessage] = useState("");
  const [messages, setMessages] = useState(messagesData);
  const [showForm, setShowForm] = useState(false);

  const filteredMessages = messages.filter((m) => {
    const matchesSearch =
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.preview.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChannel = activeChannel === "All" || m.channel === activeChannel;
    return matchesSearch && matchesChannel;
  });

  const selectedMessage = messages.find((m) => m.id === selectedMessageId);
  const unreadCount = messages.filter((m) => m.unread).length;

  function handleStarToggle(id: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m))
    );
  }

  function handleSelectMessage(id: string) {
    setSelectedMessageId(id);
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, unread: false } : m))
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4">
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
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          New Message
        </Button>
      </div>

      {/* Channel Tabs */}
      <div className="flex gap-1.5 px-6 pb-3 overflow-x-auto">
        {channels.map((channel) => (
          <Button
            key={channel}
            variant={activeChannel === channel ? "default" : "outline"}
            size="sm"
            className="text-xs shrink-0"
            onClick={() => setActiveChannel(channel)}
          >
            {channel}
          </Button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 px-6 pb-6 gap-4">
        {/* Message List */}
        <Card className="w-96 shrink-0 flex flex-col">
          <CardHeader className="py-3 px-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {filteredMessages.map((msg) => (
              <button
                key={msg.id}
                className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors ${
                  selectedMessageId === msg.id ? "bg-muted" : ""
                } ${msg.unread ? "bg-blue-50/50" : ""}`}
                onClick={() => handleSelectMessage(msg.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {msg.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${msg.unread ? "font-semibold" : "font-medium"}`}>
                        {msg.sender}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">{msg.time}</span>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${msg.unread ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                      {msg.subject}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.preview}</p>
                  </div>
                  <button
                    className="shrink-0 mt-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStarToggle(msg.id);
                    }}
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${msg.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`}
                    />
                  </button>
                </div>
              </button>
            ))}
            {filteredMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageSquare className="h-8 w-8 opacity-40 mb-2" />
                <p className="text-sm">No messages found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversation View */}
        <Card className="flex-1 flex flex-col min-w-0">
          {selectedMessage ? (
            <>
              <CardHeader className="py-3 px-5 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                      {selectedMessage.avatar}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{selectedMessage.sender}</CardTitle>
                      <p className="text-xs text-muted-foreground">{selectedMessage.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-5 space-y-4">
                {conversationData.messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2.5 ${
                        msg.isMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">{msg.content}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${msg.isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        <span className="text-[10px]">{msg.time}</span>
                        {msg.isMe && (
                          msg.status === "read" ? (
                            <CheckCheck className="h-3 w-3" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
              <div className="p-4 border-t">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={composeMessage}
                    onChange={(e) => setComposeMessage(e.target.value)}
                    className="h-9 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && composeMessage.trim()) {
                        setComposeMessage("");
                      }
                    }}
                  />
                  <Button size="sm" className="h-9 w-9 p-0 shrink-0" disabled={!composeMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto opacity-30 mb-3" />
                <p className="text-sm font-medium">Select a message to view</p>
                <p className="text-xs mt-1">Choose a conversation from the list</p>
              </div>
            </div>
          )}
        </Card>
      </div>
      <EntityFormModal
        open={showForm}
        onOpenChange={setShowForm}
        title="New Message"
        fields={messageFields}
        onSubmit={(data) => {
          const initials = (data.recipient as string).split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
          const newMsg: Message = {
            id: String(messages.length + 1),
            sender: data.recipient as string,
            avatar: initials || "??",
            subject: data.subject as string,
            preview: data.message as string,
            time: "Just now",
            unread: false,
            starred: false,
            channel: (data.channel as string) || "HR",
          };
          setMessages((prev) => [newMsg, ...prev]);
        }}
      />
    </div>
  );
}
