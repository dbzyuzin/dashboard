import { useState, FormEvent, useEffect } from 'react';
import { GROUP_COLORS } from '../utils/constants';

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, color: string) => void;
}

export function AddGroupModal({ isOpen, onClose, onAdd }: AddGroupModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(GROUP_COLORS[0]);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setColor(GROUP_COLORS[0]);
    }
  }, [isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), color);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-bg-secondary border border-border rounded-lg w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-text-primary mb-4">Добавить группу</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-text-secondary mb-1">Название</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название группы"
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded
                       text-text-primary placeholder-text-muted
                       focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm text-text-secondary mb-2">Цвет</label>
            <div className="flex gap-2 flex-wrap">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-bg-secondary' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary
                       border border-border hover:border-border-hover rounded
                       transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
            >
              Добавить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
