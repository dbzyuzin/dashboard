import { generateStorageKey, encryptData, decryptData } from "./crypto";
import {
  fetchDashboard as fetchFromBackend,
  saveDashboardToBackend,
} from "./api";
import type { DashboardData } from "../types";

const LOCAL_ONLY_KEY = "local_only_dashboards";

localStorage.removeItem("dashboard_settings");

function getLocalOnlyHashes(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_ONLY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function isLocalOnly(hash: string): boolean {
  return getLocalOnlyHashes().includes(hash);
}

function setLocalOnly(hash: string, value: boolean): void {
  const hashes = getLocalOnlyHashes();
  const index = hashes.indexOf(hash);

  if (value && index === -1) {
    hashes.push(hash);
  } else if (!value && index !== -1) {
    hashes.splice(index, 1);
  }

  if (hashes.length > 0) {
    localStorage.setItem(LOCAL_ONLY_KEY, JSON.stringify(hashes));
  } else {
    localStorage.removeItem(LOCAL_ONLY_KEY);
  }
}

export async function saveDashboard(
  data: DashboardData,
  password: string,
): Promise<void> {
  const storageKey = await generateStorageKey(password);
  const encrypted = await encryptData(data, password);

  localStorage.setItem(`dashboard_${storageKey}`, encrypted);
  setLocalOnly(storageKey, data.settings.localOnly);

  if (!data.settings.localOnly) {
    await saveDashboardToBackend(storageKey, encrypted);
  }
}

export async function loadDashboard(
  password: string,
): Promise<DashboardData | null> {
  const storageKey = await generateStorageKey(password);

  if (isLocalOnly(storageKey)) {
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
      setLocalOnly(storageKey, decrypted.settings.localOnly);
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

  if (isLocalOnly(storageKey)) {
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
    title: "Dashboard",
    groups: [],
    rootLinks: [],
    settings: {
      theme: "dark",
      localOnly: false,
    },
  };
}

export async function exportDashboard(
  password: string,
): Promise<string | null> {
  const storageKey = await generateStorageKey(password);
  return localStorage.getItem(`dashboard_${storageKey}`);
}

export async function importDashboard(
  encryptedData: string,
  importPassword: string,
  currentPassword: string,
): Promise<boolean> {
  const data = await decryptData(encryptedData, importPassword);
  if (!data) {
    return false;
  }
  await saveDashboard(data, currentPassword);
  return true;
}
