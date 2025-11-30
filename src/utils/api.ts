const API_URL = import.meta.env.VITE_API_URL || '/api';

export async function fetchDashboard(hash: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/data/${hash}`);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

export async function saveDashboardToBackend(hash: string, data: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/data/${hash}`, {
      method: 'POST',
      body: data,
    });
    return res.ok;
  } catch {
    return false;
  }
}
