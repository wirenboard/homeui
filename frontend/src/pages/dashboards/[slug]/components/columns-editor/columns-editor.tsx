import {
  DndContext,
  DragOverlay,
  closestCorners,
  useDroppable,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, type Option } from '@/components/dropdown';
import type { ColumnsEditorProps } from './types';
import './styles.css';

function distributeToColumns(flat: string[], count: number): string[][] {
  const unique = [...new Set(flat)];
  const result: string[][] = Array.from({ length: count }, () => []);
  unique.forEach((id, i) => result[i % count].push(id));
  return result;
}

const HEADER_HEIGHT = 50;

const headerCollision: CollisionDetection = (args) => {
  const h = Math.min(HEADER_HEIGHT, args.collisionRect.height);
  return closestCorners({
    ...args,
    collisionRect: {
      ...args.collisionRect,
      height: h,
      bottom: args.collisionRect.top + h,
    },
  });
};

type RenderWidget = ColumnsEditorProps['renderWidget'];

function SortableWidget({ id, renderWidget }: { id: string; renderWidget: RenderWidget }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`columnsEditor-item${isDragging ? ' is-dragging' : ''}`}
      {...listeners}
      {...attributes}
    >
      {renderWidget(id)}
    </div>
  );
}

function DroppableColumn({
  columnId,
  items,
  renderWidget,
}: {
  columnId: string;
  items: string[];
  renderWidget: RenderWidget;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });

  return (
    <div
      ref={setNodeRef}
      className={`columnsEditor-column${isOver ? ' is-over' : ''}`}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((widgetId) => (
          <SortableWidget key={widgetId} id={widgetId} renderWidget={renderWidget} />
        ))}
      </SortableContext>
    </div>
  );
}

export function ColumnsEditor({
  columns, columnCount, maxColumns, renderWidget, onChange,
}: ColumnsEditorProps) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localColumns, setLocalColumns] = useState<string[][] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const effectiveColumnCount = columnCount ?? maxColumns;

  const baseColumns = useMemo(() => {
    return columns.length === effectiveColumnCount
      ? columns
      : distributeToColumns(columns.flat(), effectiveColumnCount);
  }, [columns, effectiveColumnCount]);

  const displayed = localColumns ?? baseColumns;
  const displayedRef = useRef(displayed);
  displayedRef.current = displayed;

  const columnCountRef = useRef(columnCount);
  columnCountRef.current = columnCount;
  const columnsRef = useRef(columns);
  columnsRef.current = columns;

  useEffect(() => {
    const cc = columnCountRef.current;
    if (cc !== null && cc > maxColumns) {
      const flat = columnsRef.current.flat();
      onChange(distributeToColumns(flat, maxColumns), maxColumns);
    } else if (cc === null && columnsRef.current.length !== maxColumns) {
      const flat = columnsRef.current.flat();
      onChange(distributeToColumns(flat, maxColumns), null);
    }
  }, [maxColumns, onChange]);

  const columnOptions = useMemo(() => {
    const opts: Option<number | null>[] = [
      { label: t('common.labels.columns-auto'), value: null },
    ];
    for (let i = 1; i <= maxColumns; i++) {
      opts.push({ label: String(i), value: i });
    }
    return opts;
  }, [t, maxColumns]);

  const handleColumnCountChange = useCallback((opt: Option<number | null>) => {
    const count = opt.value;
    const flat = columnsRef.current.flat();
    if (count === null || count === undefined) {
      onChange(distributeToColumns(flat, maxColumns), null);
    } else {
      onChange(distributeToColumns(flat, count), count);
    }
  }, [onChange, maxColumns]);

  const columnIds = useMemo(
    () => displayed.map((_, i) => `column-${i}`),
    [displayed.length],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setLocalColumns(displayedRef.current.map((c) => [...c]));
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    setLocalColumns((prev) => {
      if (!prev) return prev;

      const fromColIdx = prev.findIndex((col) => col.includes(activeIdStr));
      if (fromColIdx === -1) return prev;

      let toColIdx: number;
      if (overIdStr.startsWith('column-')) {
        toColIdx = parseInt(overIdStr.replace('column-', ''), 10);
      } else {
        toColIdx = prev.findIndex((col) => col.includes(overIdStr));
      }
      if (toColIdx === -1 || fromColIdx === toColIdx) return prev;

      const cols = prev.map((c) => [...c]);
      const itemIdx = cols[fromColIdx].indexOf(activeIdStr);
      cols[fromColIdx].splice(itemIdx, 1);

      const overItemIdx = cols[toColIdx].indexOf(overIdStr);
      if (overItemIdx !== -1) {
        cols[toColIdx].splice(overItemIdx, 0, activeIdStr);
      } else {
        cols[toColIdx].push(activeIdStr);
      }

      return cols;
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over) {
      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);

      setLocalColumns((prev) => {
        if (!prev) return prev;
        if (activeIdStr === overIdStr) return prev;

        const colIdx = prev.findIndex((col) => col.includes(activeIdStr));
        if (colIdx === -1) return prev;

        const overColIdx = prev.findIndex((col) => col.includes(overIdStr));
        if (overColIdx !== colIdx || overColIdx === -1) return prev;

        const oldIndex = prev[colIdx].indexOf(activeIdStr);
        const newIndex = prev[colIdx].indexOf(overIdStr);
        const cols = prev.map((c) => [...c]);
        cols[colIdx] = arrayMove(cols[colIdx], oldIndex, newIndex);
        return cols;
      });
    }

    const final = displayedRef.current;
    setActiveId(null);
    setLocalColumns(null);
    onChange(final, columnCountRef.current);
  }, [onChange]);

  return (
    <>
      <div className="columnsEditor-toolbar">
        <span className="columnsEditor-toolbar-label">{t('common.labels.columns')}:</span>
        <Dropdown
          options={columnOptions}
          value={columnCount}
          minWidth="120px"
          size="small"
          onChange={handleColumnCountChange}
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={headerCollision}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="columnsEditor">
          {displayed.map((col, i) => (
            <DroppableColumn
              key={columnIds[i]}
              columnId={columnIds[i]}
              items={col}
              renderWidget={renderWidget}
            />
          ))}
        </div>

        <DragOverlay>
          {activeId ? <div className="columnsEditor-overlay">{renderWidget(activeId)}</div> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
