import { useState, FormEvent } from 'react';

interface LoginScreenProps {
  onLogin: (password: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

export function LoginScreen({ onLogin, isLoading, error }: LoginScreenProps) {
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      await onLogin(password);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Secure Dashboard</h1>
          <p className="text-text-secondary text-sm">Введите пароль для доступа</p>
        </div>

        <div className="relative">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            disabled={isLoading}
            className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-lg
                     text-text-primary placeholder-text-muted
                     focus:outline-none focus:border-accent
                     disabled:opacity-50 transition-colors"
            autoFocus
          />

          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {error && (
          <p className="mt-3 text-danger text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading || !password.trim()}
          className="w-full mt-4 px-4 py-3 bg-accent hover:bg-accent-hover
                   text-white font-medium rounded-lg
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors"
        >
          {isLoading ? 'Загрузка...' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
