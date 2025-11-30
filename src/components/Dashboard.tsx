import { useState } from 'react';
import type { DashboardData, Link } from '../types';
import { useDashboard } from '../hooks/useDashboard';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { GroupCard } from './GroupCard';
import { LinkItem } from './LinkItem';
import { AddLinkModal } from './AddLinkModal';
import { AddGroupModal } from './AddGroupModal';
import { EditModeToolbar } from './EditModeToolbar';
import { SettingsModal } from './SettingsModal';

interface DashboardProps {
  data: DashboardData;
  password: string;
  onUpdate: (data: DashboardData) => Promise<void>;
  onLogout: () => void;
}

export function Dashboard({ data, password, onUpdate, onLogout }: DashboardProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const {
    addGroup,
    deleteGroup,
    updateGroup,
    addLink,
    deleteLink,
    updateLink,
    moveLink,
    moveGroup,
  } = useDashboard(data, onUpdate);

  const {
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    getDragItem,
  } = useDragAndDrop();

  const handleOpenAll = (links: Link[]) => {
    links.forEach((link) => {
      window.open(link.url, '_blank', 'noopener,noreferrer');
    });
  };

  const handleImport = async (importedData: DashboardData) => {
    await onUpdate(importedData);
  };

  const handleRootLinksDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');

    const item = getDragItem(e);
    if (!item || item.type !== 'link') return;

    const isSameArea = item.sourceGroupId === null;
    const currentIndex = data.rootLinks.findIndex(l => l.id === item.id);
    const adjustedIndex = isSameArea && currentIndex < targetIndex
      ? targetIndex - 1
      : targetIndex;

    moveLink(item.id, item.sourceGroupId, null, adjustedIndex);
  };

  const sortedGroups = [...data.groups].sort((a, b) => a.order - b.order);

  return (
    <div className={`min-h-screen bg-bg-primary ${isEditMode ? 'pb-24' : ''}`}>
      <header className="sticky top-0 bg-bg-primary/95 backdrop-blur border-b border-border z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isEditMode
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              {isEditMode ? 'Редактирование' : 'Редактировать'}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 text-text-secondary hover:text-text-primary
                       hover:bg-bg-tertiary rounded-lg text-sm transition-colors"
            >
              Настройки
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {sortedGroups.length === 0 && data.rootLinks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-secondary text-lg mb-6">Ваш дашборд пуст</p>
            {!isEditMode && (
              <button
                onClick={() => setIsEditMode(true)}
                className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl
                         transition-colors font-medium"
              >
                Начать добавлять
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {data.rootLinks.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full bg-text-muted" />
                  <h2 className="text-lg font-medium text-text-secondary">
                    Без группы
                  </h2>
                  <span className="text-text-muted text-sm">{data.rootLinks.length}</span>
                </div>

                <div
                  className="min-h-[80px]"
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleRootLinksDrop(e, data.rootLinks.length)}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                    {data.rootLinks.map((link, index) => (
                      <div
                        key={link.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleRootLinksDrop(e, index)}
                      >
                        <LinkItem
                          link={link}
                          isEditMode={isEditMode}
                          onDelete={() => deleteLink(link.id, null)}
                          onUpdate={(updates) => updateLink(link.id, null, updates)}
                          onDragStart={(e) =>
                            handleDragStart(e, { type: 'link', id: link.id, sourceGroupId: null })
                          }
                          onDragEnd={handleDragEnd}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {sortedGroups.map((group, index) => (
              <GroupCard
                key={group.id}
                group={group}
                groupIndex={index}
                isEditMode={isEditMode}
                onOpenAll={() => handleOpenAll(group.links)}
                onDeleteGroup={() => deleteGroup(group.id)}
                onUpdateGroup={(updates) => updateGroup(group.id, updates)}
                onDeleteLink={(linkId) => deleteLink(linkId, group.id)}
                onUpdateLink={(linkId, updates) =>
                  updateLink(linkId, group.id, updates)
                }
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                getDragItem={getDragItem}
                onMoveLink={moveLink}
                onMoveGroup={moveGroup}
              />
            ))}
          </div>
        )}
      </main>

      {isEditMode && (
        <EditModeToolbar
          onAddGroup={() => setShowAddGroup(true)}
          onAddLink={() => setShowAddLink(true)}
          onDone={() => setIsEditMode(false)}
        />
      )}

      <AddLinkModal
        isOpen={showAddLink}
        onClose={() => setShowAddLink(false)}
        onAdd={addLink}
        groups={data.groups}
      />

      <AddGroupModal
        isOpen={showAddGroup}
        onClose={() => setShowAddGroup(false)}
        onAdd={addGroup}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        password={password}
        onLogout={onLogout}
        onImport={handleImport}
        localOnly={data.settings.localOnly}
        onLocalOnlyChange={(value) => {
          onUpdate({
            ...data,
            settings: { ...data.settings, localOnly: value }
          });
        }}
      />
    </div>
  );
}
