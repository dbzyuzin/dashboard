import { useState } from 'react';
import type { LinkGroup, Link } from '../types';
import type { DragItem } from '../hooks/useDragAndDrop';
import { LinkItem } from './LinkItem';

interface GroupCardProps {
  group: LinkGroup;
  groupIndex: number;
  isEditMode: boolean;
  onOpenAll: () => void;
  onDeleteGroup: () => void;
  onUpdateGroup: (updates: Partial<LinkGroup>) => void;
  onDeleteLink: (linkId: string) => void;
  onUpdateLink: (linkId: string, updates: Partial<Link>) => void;
  onDragStart: (e: React.DragEvent, item: DragItem) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  getDragItem: (e: React.DragEvent) => DragItem | null;
  onMoveLink: (linkId: string, fromGroupId: string | null, toGroupId: string | null, toIndex: number) => void;
  onMoveGroup: (groupId: string, toIndex: number) => void;
}

export function GroupCard({
  group,
  groupIndex,
  isEditMode,
  onOpenAll,
  onDeleteGroup,
  onUpdateGroup,
  onDeleteLink,
  onUpdateLink,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  getDragItem,
  onMoveLink,
  onMoveGroup,
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

  const handleHeaderDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');

    const item = getDragItem(e);
    if (!item) return;

    if (item.type === 'group' && item.id !== group.id) {
      onMoveGroup(item.id, groupIndex);
    } else if (item.type === 'link') {
      onMoveLink(item.id, item.sourceGroupId, group.id, group.links.length);
    }
  };

  const handleLinksDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');

    const item = getDragItem(e);
    if (!item || item.type !== 'link') return;

    const isSameGroup = item.sourceGroupId === group.id;
    const adjustedIndex = isSameGroup && group.links.findIndex(l => l.id === item.id) < targetIndex
      ? targetIndex - 1
      : targetIndex;

    onMoveLink(item.id, item.sourceGroupId, group.id, adjustedIndex);
  };

  return (
    <div className="mb-8">
      <div
        className="flex items-center gap-3 mb-4 group"
        draggable={isEditMode}
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart(e, { type: 'group', id: group.id, sourceGroupId: null });
        }}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={handleHeaderDrop}
      >
        {isEditMode && (
          <span className="cursor-grab text-text-muted hover:text-text-secondary">
            ⠿
          </span>
        )}

        <button
          onClick={() => onUpdateGroup({ isCollapsed: !group.isCollapsed })}
          className="text-text-muted hover:text-text-secondary transition-colors text-xs"
        >
          {group.isCollapsed ? '▶' : '▼'}
        </button>

        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: group.color }}
        />

        {isEditingName ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-bg-tertiary text-text-primary px-2 py-1 rounded
                     border border-border focus:border-accent focus:outline-none text-lg"
            autoFocus
          />
        ) : (
          <h2
            className={`flex-1 text-lg font-medium text-text-primary ${
              isEditMode ? 'cursor-pointer hover:text-accent' : ''
            }`}
            onClick={() => isEditMode && setIsEditingName(true)}
          >
            {group.name}
          </h2>
        )}

        <span className="text-text-muted text-sm">{group.links.length}</span>

        {!group.isCollapsed && group.links.length > 0 && (
          <button
            onClick={onOpenAll}
            className="text-text-muted hover:text-accent transition-colors"
            title="Открыть все ссылки"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
              <path d="M14 9l3 3-3 3" />
            </svg>
          </button>
        )}

        {isEditMode && (
          <button
            onClick={onDeleteGroup}
            className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all"
            title="Удалить группу"
          >
            ✕
          </button>
        )}
      </div>

      {!group.isCollapsed && (
        <div
          className="min-h-[80px]"
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDrop={(e) => handleLinksDrop(e, group.links.length)}
        >
          {group.links.length === 0 ? (
            <div className="flex items-center justify-center h-20 border-2 border-dashed border-border rounded-xl">
              <p className="text-text-muted text-sm">
                {isEditMode ? 'Перетащите ссылки сюда' : 'Нет ссылок'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {group.links.map((link, index) => (
                <div
                  key={link.id}
                  onDragOver={onDragOver}
                  onDrop={(e) => handleLinksDrop(e, index)}
                >
                  <LinkItem
                    link={link}
                    isEditMode={isEditMode}
                    onDelete={() => onDeleteLink(link.id)}
                    onUpdate={(updates) => onUpdateLink(link.id, updates)}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      onDragStart(e, { type: 'link', id: link.id, sourceGroupId: group.id });
                    }}
                    onDragEnd={onDragEnd}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
