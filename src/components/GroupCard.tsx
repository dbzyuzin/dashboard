import { useState } from 'react';
import type { LinkGroup, Link } from '../types';
import { LinkItem } from './LinkItem';

interface GroupCardProps {
  group: LinkGroup;
  isEditMode: boolean;
  onOpenAll: () => void;
  onDeleteGroup: () => void;
  onUpdateGroup: (updates: Partial<LinkGroup>) => void;
  onDeleteLink: (linkId: string) => void;
  onUpdateLink: (linkId: string, updates: Partial<Link>) => void;
  onDragStartGroup: (e: React.DragEvent) => void;
  onDragEndGroup: (e: React.DragEvent) => void;
  onDragStartLink: (e: React.DragEvent, linkId: string) => void;
  onDragEndLink: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetIndex: number) => void;
}

export function GroupCard({
  group,
  isEditMode,
  onOpenAll,
  onDeleteGroup,
  onUpdateGroup,
  onDeleteLink,
  onUpdateLink,
  onDragStartGroup,
  onDragEndGroup,
  onDragStartLink,
  onDragEndLink,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}: GroupCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(group.name);

  const handleSaveName = () => {
    if (editName.trim() && editName !== group.name) {
      onUpdateGroup({ name: editName.trim() });
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setEditName(group.name);
      setIsEditingName(false);
    }
  };

  return (
    <div
      className="bg-bg-secondary border border-border rounded-lg overflow-hidden"
      draggable={isEditMode}
      onDragStart={onDragStartGroup}
      onDragEnd={onDragEndGroup}
    >
      <div
        className="flex items-center gap-2 p-3 border-b border-border"
        style={{ borderLeftColor: group.color, borderLeftWidth: '3px' }}
      >
        {isEditMode && (
          <span className="cursor-grab text-text-muted hover:text-text-secondary">
            ⠿
          </span>
        )}

        <button
          onClick={() => onUpdateGroup({ isCollapsed: !group.isCollapsed })}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          {group.isCollapsed ? '▶' : '▼'}
        </button>

        {isEditingName ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-bg-tertiary text-text-primary px-2 py-0.5 rounded
                     border border-border focus:border-accent focus:outline-none"
            autoFocus
          />
        ) : (
          <h3
            className={`flex-1 font-medium text-text-primary ${
              isEditMode ? 'cursor-pointer hover:text-accent' : ''
            }`}
            onClick={() => isEditMode && setIsEditingName(true)}
          >
            {group.name}
          </h3>
        )}

        <span className="text-text-muted text-sm">{group.links.length}</span>

        {isEditMode && (
          <button
            onClick={onDeleteGroup}
            className="text-text-muted hover:text-danger transition-colors"
            title="Удалить группу"
          >
            ✕
          </button>
        )}
      </div>

      {!group.isCollapsed && (
        <div
          className="p-2 min-h-[40px]"
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, group.links.length)}
        >
          {group.links.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-2">
              {isEditMode ? 'Перетащите ссылки сюда' : 'Нет ссылок'}
            </p>
          ) : (
            group.links.map((link, index) => (
              <div
                key={link.id}
                onDragOver={onDragOver}
                onDrop={(e) => {
                  e.stopPropagation();
                  onDrop(e, index);
                }}
              >
                <LinkItem
                  link={link}
                  isEditMode={isEditMode}
                  onDelete={() => onDeleteLink(link.id)}
                  onUpdate={(updates) => onUpdateLink(link.id, updates)}
                  onDragStart={(e) => onDragStartLink(e, link.id)}
                  onDragEnd={onDragEndLink}
                />
              </div>
            ))
          )}
        </div>
      )}

      {!group.isCollapsed && group.links.length > 0 && (
        <div className="px-3 pb-3">
          <button
            onClick={onOpenAll}
            className="w-full py-1.5 text-sm text-accent hover:text-accent-hover
                     border border-border hover:border-accent rounded
                     transition-colors"
          >
            Открыть все ({group.links.length})
          </button>
        </div>
      )}
    </div>
  );
}
