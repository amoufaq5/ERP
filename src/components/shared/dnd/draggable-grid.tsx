"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { reorder } from "./dnd-utils";

// --- Sortable grid item ---

interface SortableGridItemProps {
  id: string;
  isDragging: boolean;
  children: React.ReactNode;
}

function SortableGridItem({ id, isDragging, children }: SortableGridItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
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
        "cursor-grab touch-none rounded-lg transition-shadow active:cursor-grabbing",
        isDragging && "opacity-50 shadow-lg scale-[1.03]"
      )}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

// --- Draggable Grid ---

interface DraggableGridProps<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
  columns?: number;
  className?: string;
}

const gridColsMap: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

export function DraggableGrid<T>({
  items,
  onReorder,
  renderItem,
  keyExtractor,
  columns = 3,
  className,
}: DraggableGridProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const itemIds = items.map(keyExtractor);
  const gridColsClass = gridColsMap[columns] ?? "grid-cols-3";

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = itemIds.indexOf(String(active.id));
    const newIndex = itemIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(reorder(items, oldIndex, newIndex));
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={itemIds} strategy={rectSortingStrategy}>
        <div className={cn("grid gap-4", gridColsClass, className)}>
          {items.map((item) => {
            const id = keyExtractor(item);
            return (
              <SortableGridItem key={id} id={id} isDragging={activeId === id}>
                {renderItem(item)}
              </SortableGridItem>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
