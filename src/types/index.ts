export interface Link {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  createdAt: number;
}

export interface LinkGroup {
  id: string;
  name: string;
  color: string;
  links: Link[];
  order: number;
  isCollapsed: boolean;
}

export interface DashboardData {
  version: 1;
  groups: LinkGroup[];
  rootLinks: Link[];
  settings: {
    theme: 'dark';
  };
}

export interface AppState {
  isAuthenticated: boolean;
  isEditMode: boolean;
  dashboardData: DashboardData | null;
}
