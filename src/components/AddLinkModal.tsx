import { useState, FormEvent, useEffect } from 'react';
import type { LinkGroup } from '../types';

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (link: { title: string; url: string; favicon?: string }, groupId: string | null) => void;
  groups: LinkGroup[];
  defaultGroupId: string | null;
}

export function AddLinkModal({ isOpen, onClose, onAdd, groups, defaultGroupId }: AddLinkModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [groupId, setGroupId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGroupId(defaultGroupId ?? '');
    } else {
      setUrl('');
      setTitle('');
      setGroupId('');
    }
  }, [isOpen, defaultGroupId]);

  const extractDomain = (urlString: string): string | null => {
    try {
      return new URL(urlString).hostname;
    } catch {
      return null;
    }
  };

  const handleUrlChange = async (newUrl: string) => {
    setUrl(newUrl);

    if (!title && newUrl) {
      const domain = extractDomain(newUrl);
      if (domain) {
        setTitle(domain);
        setIsLoading(true);

        try {
          const response = await fetch(newUrl, { mode: 'cors' });
          const html = await response.text();
          const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (match && match[1]) {
            setTitle(match[1].trim());
          }
        } catch {
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!url.trim()) return;

    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    const domain = extractDomain(finalUrl);
    const favicon = domain
      ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
      : undefined;

    onAdd(
      {
        title: title.trim() || finalUrl,
        url: finalUrl,
        favicon,
      },
      groupId || null
    );

    onClose();
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
        <h2 className="text-lg font-semibold text-text-primary mb-4">Добавить ссылку</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-text-secondary mb-1">URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded
                       text-text-primary placeholder-text-muted
                       focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-text-secondary mb-1">
              Название {isLoading && <span className="text-text-muted">(загрузка...)</span>}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название ссылки"
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded
                       text-text-primary placeholder-text-muted
                       focus:outline-none focus:border-accent"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm text-text-secondary mb-1">Группа</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded
                       text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="">Без группы</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
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
              disabled={!url.trim()}
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
