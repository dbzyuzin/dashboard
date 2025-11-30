import { generateStorageKey, encryptData, decryptData } from './crypto';
import { fetchDashboard as fetchFromBackend, saveDashboardToBackend } from './api';
import type { DashboardData } from '../types';

const SETTINGS_KEY = 'dashboard_settings';

function getStoredSettings(): { localOnly: boolean } | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSettings(settings: { localOnly: boolean }): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function saveDashboard(data: DashboardData, password: string): Promise<void> {
  const storageKey = await generateStorageKey(password);
  const encrypted = await encryptData(data, password);

  localStorage.setItem(`dashboard_${storageKey}`, encrypted);
  saveSettings({ localOnly: data.settings.localOnly });

  if (!data.settings.localOnly) {
    await saveDashboardToBackend(storageKey, encrypted);
  }
}

export async function loadDashboard(password: string): Promise<DashboardData | null> {
  const storageKey = await generateStorageKey(password);
  const settings = getStoredSettings();

  if (settings?.localOnly) {
    const localData = localStorage.getItem(`dashboard_${storageKey}`);
    if (localData) {
      return decryptData(localData, password);
    }
    return null;
  }

  const backendData = await fetchFromBackend(storageKey);
  if (backendData) {
    const decrypted = await decryptData(backendData, password);
    if (decrypted) {
      localStorage.setItem(`dashboard_${storageKey}`, backendData);
      saveSettings({ localOnly: decrypted.settings.localOnly });
      return decrypted;
    }
  }

  const localData = localStorage.getItem(`dashboard_${storageKey}`);
  if (localData) {
    return decryptData(localData, password);
  }

  return null;
}

export async function dashboardExists(password: string): Promise<boolean> {
  const storageKey = await generateStorageKey(password);
  const settings = getStoredSettings();

  if (settings?.localOnly) {
    return localStorage.getItem(`dashboard_${storageKey}`) !== null;
  }

  const backendData = await fetchFromBackend(storageKey);
  if (backendData !== null) {
    return true;
  }

  return localStorage.getItem(`dashboard_${storageKey}`) !== null;
}

export function createEmptyDashboard(): DashboardData {
  return {
    version: 1,
    groups: [],
    rootLinks: [],
    settings: {
      theme: 'dark',
      localOnly: false,
    }
  };
}

export async function exportDashboard(password: string): Promise<string | null> {
  const storageKey = await generateStorageKey(password);
  return localStorage.getItem(`dashboard_${storageKey}`);
}

export async function importDashboard(
  encryptedData: string,
  importPassword: string,
  currentPassword: string
): Promise<boolean> {
  const data = await decryptData(encryptedData, importPassword);
  if (!data) {
    return false;
  }
  await saveDashboard(data, currentPassword);
  return true;
}
