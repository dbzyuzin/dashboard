import { useState, useRef, FormEvent } from 'react';
import { exportDashboard } from '../utils/storage';
import { decryptData } from '../utils/crypto';
import type { DashboardData } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  password: string;
  onLogout: () => void;
  onImport: (data: DashboardData) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  password,
  onLogout,
  onImport,
}: SettingsModalProps) {
  const [importPassword, setImportPassword] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const encrypted = await exportDashboard(password);
    if (!encrypted) return;

    const date = new Date().toISOString().split('T')[0];
    const filename = `dashboard-backup-${date}.json`;

    const blob = new Blob([encrypted], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);

    try {
      const content = await file.text();
      setIsImporting(true);

      const data = await decryptData(content, importPassword || password);

      if (!data) {
        setImportError('Неверный пароль или повреждённый файл');
        setIsImporting(false);
        return;
      }

      onImport(data);
      onClose();
    } catch {
      setImportError('Ошибка чтения файла');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleImportClick();
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
        <h2 className="text-lg font-semibold text-text-primary mb-6">Настройки</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">Резервное копирование</h3>
            <button
              onClick={handleExport}
              className="w-full px-4 py-2 bg-bg-tertiary hover:bg-border text-text-primary
                       border border-border rounded-lg transition-colors"
            >
              Скачать резервную копию
            </button>
          </div>

          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">Восстановление</h3>
            <form onSubmit={handleImportSubmit} className="space-y-2">
              <input
                type="password"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                placeholder="Пароль от файла (если отличается)"
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded
                         text-text-primary placeholder-text-muted
                         focus:outline-none focus:border-accent text-sm"
              />
              <button
                type="submit"
                disabled={isImporting}
                className="w-full px-4 py-2 bg-bg-tertiary hover:bg-border text-text-primary
                         border border-border rounded-lg transition-colors
                         disabled:opacity-50"
              >
                {isImporting ? 'Загрузка...' : 'Загрузить резервную копию'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              {importError && (
                <p className="text-danger text-sm">{importError}</p>
              )}
            </form>
          </div>

          <div className="pt-4 border-t border-border">
            <button
              onClick={onLogout}
              className="w-full px-4 py-2 bg-danger/10 hover:bg-danger/20 text-danger
                       border border-danger/30 rounded-lg transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
