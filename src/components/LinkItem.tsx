import { useState } from 'react';
import type { Link } from '../types';

interface LinkItemProps {
  link: Link;
  isEditMode: boolean;
  onDelete: () => void;
  onUpdate: (updates: Partial<Link>) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

export function LinkItem({
  link,
  isEditMode,
  onDelete,
  onUpdate,
  onDragStart,
  onDragEnd,
}: LinkItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(link.title);

  const domain = (() => {
    try {
      return new URL(link.url).hostname;
    } catch {
      return '';
    }
  })();

  const faviconUrl = domain
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    : undefined;

  const handleClick = (e: React.MouseEvent) => {
    if (isEditMode) {
      e.preventDefault();
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (editTitle.trim() && editTitle !== link.title) {
      onUpdate({ title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditTitle(link.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      className="group flex items-center gap-2 py-1.5 px-2 rounded hover:bg-bg-tertiary transition-colors"
      draggable={isEditMode}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {isEditMode && (
        <span className="cursor-grab text-text-muted hover:text-text-secondary">
          ⠿
        </span>
      )}

      {faviconUrl && (
        <img
          src={faviconUrl}
          alt=""
          className="w-4 h-4 flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}

      {isEditing ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-bg-tertiary text-text-primary text-sm px-2 py-0.5 rounded
                   border border-border focus:border-accent focus:outline-none"
          autoFocus
        />
      ) : (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="flex-1 text-sm text-text-primary hover:text-accent truncate transition-colors"
        >
          {link.title}
        </a>
      )}

      {isEditMode && !isEditing && (
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger
                   transition-opacity text-sm"
          title="Удалить"
        >
          ✕
        </button>
      )}
    </div>
  );
}
