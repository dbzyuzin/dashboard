import { useState, useCallback } from 'react';
import { loadDashboard, saveDashboard, createEmptyDashboard } from '../utils/storage';
import type { DashboardData } from '../types';

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  dashboardData: DashboardData | null;
  password: string | null;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  updateDashboard: (data: DashboardData) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [password, setPassword] = useState<string | null>(null);

  const login = useCallback(async (inputPassword: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      let data = await loadDashboard(inputPassword);

      if (!data) {
        data = createEmptyDashboard();
        await saveDashboard(data, inputPassword);
      }

      setDashboardData(data);
      setPassword(inputPassword);
      setIsAuthenticated(true);
      return true;
    } catch {
      setError('Неверный пароль или данные не найдены');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setDashboardData(null);
    setPassword(null);
    setError(null);
  }, []);

  const updateDashboard = useCallback(async (data: DashboardData) => {
    if (!password) return;
    setDashboardData(data);
    await saveDashboard(data, password);
  }, [password]);

  return {
    isAuthenticated,
    isLoading,
    error,
    dashboardData,
    password,
    login,
    logout,
    updateDashboard,
  };
}
