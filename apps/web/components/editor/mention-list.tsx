"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";

export interface MentionItem {
  id: string;
  label: string;
  type: "character" | "location";
}

interface MentionListProps {
  items: MentionItem[];
  command: (item: { id: string; label: string }) => void;
}

export interface MentionListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const MentionList = forwardRef<MentionListHandle, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    // 当 items 变化时重置选中
    useEffect(() => setSelectedIndex(0), [items]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item.id, label: item.label });
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="rounded-md border bg-popover p-2 text-sm text-muted-foreground shadow-md">
          无匹配结果
        </div>
      );
    }

    return (
      <div className="z-50 rounded-md border bg-popover shadow-md overflow-hidden min-w-[160px]">
        {items.map((item, index) => (
          <button
            key={item.id}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted"
            }`}
            onClick={() => selectItem(index)}
          >
            <span className="text-xs text-muted-foreground">
              {item.type === "character" ? "👤" : "📍"}
            </span>
            {item.label}
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = "MentionList";
