"use client";

import React, { useState, useCallback } from "react";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// --- Sortable card wrapper ---

interface SortableCardProps {
  id: string;
  children: React.ReactNode;
}

function SortableCard({ id, children }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none",
        isDragging && "opacity-50"
      )}
      {...attributes}
      {...listeners}
    >
      <Card className="cursor-grab p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing">
        {children}
      </Card>
    </div>
  );
}

// --- Droppable column ---

interface ColumnProps {
  id: string;
  title: string;
  color?: string;
  count: number;
  isOver: boolean;
  children: React.ReactNode;
}

function Column({ id, title, color, count, isOver, children }: ColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-lg border border-border bg-muted/30">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          {color && (
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
          )}
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {count}
        </Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2 overflow-y-auto p-3 transition-colors",
          "max-h-[calc(100vh-16rem)]",
          isOver && "bg-primary/5 ring-2 ring-inset ring-primary/20"
        )}
      >
        {children}
      </div>
    </div>
  );
}

// --- Kanban Board ---

interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn[];
  items: Record<string, T[]>;
  onMove: (itemId: string, fromColumn: string, toColumn: string) => void;
  renderCard: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
  className?: string;
}

export function KanbanBoard<T>({
  columns,
  items,
  onMove,
  renderCard,
  keyExtractor,
  className,
}: KanbanBoardProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Find which column an item belongs to
  const findColumnForItem = useCallback(
    (itemId: string): string | undefined => {
      for (const colId of Object.keys(items)) {
        if (items[colId].some((item) => keyExtractor(item) === itemId)) {
          return colId;
        }
      }
      return undefined;
    },
    [items, keyExtractor]
  );

  // Find the active item for the drag overlay
  const findItem = useCallback(
    (itemId: string): T | undefined => {
      for (const colId of Object.keys(items)) {
        const found = items[colId].find(
          (item) => keyExtractor(item) === itemId
        );
        if (found) return found;
      }
      return undefined;
    },
    [items, keyExtractor]
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) {
      setOverColumnId(null);
      return;
    }

    const overId = String(over.id);
    // Check if over a column directly
    const isColumn = columns.some((col) => col.id === overId);
    if (isColumn) {
      setOverColumnId(overId);
    } else {
      // Over a card — find its column
      const col = findColumnForItem(overId);
      setOverColumnId(col ?? null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverColumnId(null);

    if (!over) return;

    const activeItemId = String(active.id);
    const overId = String(over.id);

    const fromColumn = findColumnForItem(activeItemId);
    if (!fromColumn) return;

    // Determine target column: either the over element is a column, or find the column of the over card
    const isColumn = columns.some((col) => col.id === overId);
    const toColumn = isColumn ? overId : findColumnForItem(overId);
    if (!toColumn) return;

    if (fromColumn !== toColumn) {
      onMove(activeItemId, fromColumn, toColumn);
    }
  }

  function handleDragCancel() {
    setActiveId(null);
    setOverColumnId(null);
  }

  const activeItem = activeId ? findItem(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        className={cn(
          "flex gap-4 overflow-x-auto pb-4",
          className
        )}
      >
        {columns.map((column) => {
          const columnItems = items[column.id] ?? [];
          const itemIds = columnItems.map(keyExtractor);

          return (
            <SortableContext
              key={column.id}
              items={itemIds}
              strategy={verticalListSortingStrategy}
            >
              <Column
                id={column.id}
                title={column.title}
                color={column.color}
                count={columnItems.length}
                isOver={overColumnId === column.id}
              >
                {columnItems.map((item) => {
                  const id = keyExtractor(item);
                  return (
                    <SortableCard key={id} id={id}>
                      {renderCard(item)}
                    </SortableCard>
                  );
                })}
              </Column>
            </SortableContext>
          );
        })}
      </div>

      <DragOverlay>
        {activeItem ? (
          <Card className="w-64 cursor-grabbing p-3 shadow-xl ring-2 ring-primary/30">
            {renderCard(activeItem)}
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
