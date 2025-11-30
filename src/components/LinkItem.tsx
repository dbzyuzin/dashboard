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
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
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
      className={`group relative flex flex-col items-center p-4 rounded-xl
                bg-bg-secondary hover:bg-bg-tertiary border border-border
                hover:border-accent/50 transition-all cursor-pointer
                ${isEditMode ? 'hover:shadow-lg' : ''}`}
      draggable={isEditMode}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {isEditMode && (
        <>
          <span className="absolute top-2 left-2 cursor-grab text-text-muted hover:text-text-secondary">
            ⠿
          </span>
          <button
            onClick={onDelete}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100
                     text-text-muted hover:text-danger transition-opacity"
            title="Удалить"
          >
            ✕
          </button>
        </>
      )}

      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="flex flex-col items-center gap-3 w-full"
      >
        <div className="w-12 h-12 rounded-xl bg-bg-tertiary flex items-center justify-center overflow-hidden">
          {faviconUrl ? (
            <img
              src={faviconUrl}
              alt=""
              className="w-8 h-8"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML =
                  `<span class="text-2xl text-text-muted">${link.title[0]?.toUpperCase() || '?'}</span>`;
              }}
            />
          ) : (
            <span className="text-2xl text-text-muted">
              {link.title[0]?.toUpperCase() || '?'}
            </span>
          )}
        </div>

        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-bg-tertiary text-text-primary text-sm text-center px-2 py-1 rounded
                     border border-border focus:border-accent focus:outline-none"
            autoFocus
          />
        ) : (
          <span className="text-sm text-text-primary text-center line-clamp-2 w-full">
            {link.title}
          </span>
        )}
      </a>
    </div>
  );
}
