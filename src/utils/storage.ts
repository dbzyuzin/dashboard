import { generateStorageKey, encryptData, decryptData } from './crypto';
import type { DashboardData } from '../types';

export async function saveDashboard(data: DashboardData, password: string): Promise<void> {
  const storageKey = await generateStorageKey(password);
  const encrypted = await encryptData(data, password);
  localStorage.setItem(`dashboard_${storageKey}`, encrypted);
}

export async function loadDashboard(password: string): Promise<DashboardData | null> {
  const storageKey = await generateStorageKey(password);
  const encrypted = localStorage.getItem(`dashboard_${storageKey}`);

  if (!encrypted) {
    return null;
  }

  return decryptData(encrypted, password);
}

export async function dashboardExists(password: string): Promise<boolean> {
  const storageKey = await generateStorageKey(password);
  return localStorage.getItem(`dashboard_${storageKey}`) !== null;
}

export function createEmptyDashboard(): DashboardData {
  return {
    version: 1,
    groups: [],
    rootLinks: [],
    settings: {
      theme: 'dark'
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
