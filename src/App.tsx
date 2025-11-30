import { useAuth } from './hooks/useAuth';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard';

export default function App() {
  const {
    isAuthenticated,
    isLoading,
    error,
    dashboardData,
    password,
    login,
    logout,
    updateDashboard,
  } = useAuth();

  if (!isAuthenticated || !dashboardData || !password) {
    return (
      <LoginScreen
        onLogin={login}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  return (
    <Dashboard
      data={dashboardData}
      password={password}
      onUpdate={updateDashboard}
      onLogout={logout}
    />
  );
}
