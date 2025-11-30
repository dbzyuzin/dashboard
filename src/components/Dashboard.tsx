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
    handleDrop,
  } = useDragAndDrop();

  const handleOpenAll = (links: Link[]) => {
    links.forEach((link) => {
      window.open(link.url, '_blank', 'noopener,noreferrer');
    });
  };

  const handleImport = async (importedData: DashboardData) => {
    await onUpdate(importedData);
  };

  const sortedGroups = [...data.groups].sort((a, b) => a.order - b.order);

  return (
    <div className={`min-h-screen bg-bg-primary ${isEditMode ? 'pb-24' : ''}`}>
      <header className="sticky top-0 bg-bg-primary/95 backdrop-blur border-b border-border z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-text-primary">Secure Dashboard</h1>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                isEditMode
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              {isEditMode ? 'Редактирование' : 'Редактировать'}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="px-3 py-1.5 text-text-secondary hover:text-text-primary
                       hover:bg-bg-tertiary rounded text-sm transition-colors"
            >
              Настройки
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {sortedGroups.length === 0 && data.rootLinks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary mb-4">Ваш дашборд пуст</p>
            {!isEditMode && (
              <button
                onClick={() => setIsEditMode(true)}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg
                         transition-colors"
              >
                Начать добавлять
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedGroups.map((group, index) => (
                <div
                  key={group.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) =>
                    handleDrop(e, null, index, moveLink, moveGroup)
                  }
                >
                  <GroupCard
                    group={group}
                    isEditMode={isEditMode}
                    onOpenAll={() => handleOpenAll(group.links)}
                    onDeleteGroup={() => deleteGroup(group.id)}
                    onUpdateGroup={(updates) => updateGroup(group.id, updates)}
                    onDeleteLink={(linkId) => deleteLink(linkId, group.id)}
                    onUpdateLink={(linkId, updates) =>
                      updateLink(linkId, group.id, updates)
                    }
                    onDragStartGroup={(e) =>
                      handleDragStart(e, 'group', group.id, null)
                    }
                    onDragEndGroup={handleDragEnd}
                    onDragStartLink={(e, linkId) =>
                      handleDragStart(e, 'link', linkId, group.id)
                    }
                    onDragEndLink={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={(e, targetIndex) =>
                      handleDrop(e, group.id, targetIndex, moveLink, moveGroup)
                    }
                  />
                </div>
              ))}
            </div>

            {data.rootLinks.length > 0 && (
              <div className="mt-6">
                <div
                  className="bg-bg-secondary border border-border rounded-lg p-4"
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) =>
                    handleDrop(e, null, data.rootLinks.length, moveLink, moveGroup)
                  }
                >
                  <h3 className="text-text-secondary text-sm font-medium mb-3">
                    Без группы
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                    {data.rootLinks.map((link, index) => (
                      <div
                        key={link.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => {
                          e.stopPropagation();
                          handleDrop(e, null, index, moveLink, moveGroup);
                        }}
                      >
                        <LinkItem
                          link={link}
                          isEditMode={isEditMode}
                          onDelete={() => deleteLink(link.id, null)}
                          onUpdate={(updates) => updateLink(link.id, null, updates)}
                          onDragStart={(e) =>
                            handleDragStart(e, 'link', link.id, null)
                          }
                          onDragEnd={handleDragEnd}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
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
      />
    </div>
  );
}
