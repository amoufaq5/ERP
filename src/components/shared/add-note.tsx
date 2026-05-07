"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/lib/user-context";
import { useActivity, type ActivityEntry } from "@/lib/activity/activity-context";
import type { ActivityEntityType } from "@/lib/activity/activity-service";

interface AddNoteProps {
  entityType: ActivityEntityType;
  entityId: string;
  onSubmit?: (entry: ActivityEntry) => void;
}

export function AddNote({ entityType, entityId, onSubmit }: AddNoteProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useCurrentUser();
  const { addActivity } = useActivity();

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmitting(true);

    const entry = addActivity({
      entityType,
      entityId,
      activityType: "note",
      title: "Note added",
      description: trimmed,
      userId: user.id,
      userName: user.name,
    });

    setText("");
    setSubmitting(false);
    onSubmit?.(entry);
  }, [text, entityType, entityId, user, addActivity, onSubmit]);

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Add a note..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="resize-none"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={!text.trim() || submitting}
          onClick={handleSubmit}
        >
          Add Note
        </Button>
      </div>
    </div>
  );
}
