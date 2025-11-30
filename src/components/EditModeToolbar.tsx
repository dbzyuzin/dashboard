interface EditModeToolbarProps {
  onAddGroup: () => void;
  onAddLink: () => void;
  onDone: () => void;
}

export function EditModeToolbar({ onAddGroup, onAddLink, onDone }: EditModeToolbarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-border p-4 z-40">
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-4">
        <button
          onClick={onAddGroup}
          className="px-4 py-2 bg-bg-tertiary hover:bg-border text-text-primary
                   border border-border rounded-lg transition-colors"
        >
          + Группа
        </button>
        <button
          onClick={onAddLink}
          className="px-4 py-2 bg-bg-tertiary hover:bg-border text-text-primary
                   border border-border rounded-lg transition-colors"
        >
          + Ссылка
        </button>
        <button
          onClick={onDone}
          className="px-6 py-2 bg-accent hover:bg-accent-hover text-white
                   rounded-lg transition-colors"
        >
          Готово
        </button>
      </div>
    </div>
  );
}
