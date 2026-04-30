export type AppCategory =
  | 'integrations'
  | 'drivers'
  | 'automation'
  | 'ui'
  | 'monitoring'
  | 'network'
  | 'system';

export type AppSource = 'official' | 'community';

export type AppStatus = 'not_installed' | 'installed' | 'update_available' | 'installing';

export type AppKind = 'app' | 'bundle';

export interface AppRelations {
  requires?: string[];
  recommends?: string[];
  worksWith?: string[];
  conflicts?: string[];
}

export interface AppItem {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  category: AppCategory;
  source: AppSource;
  author: string;
  installedVersion?: string;
  latestVersion: string;
  size: string;
  sizeMb: number;
  status: AppStatus;
  iconText: string;
  iconColor: 'red' | 'blue' | 'green' | 'yellow' | 'gray';
  featured?: boolean;
  autostart?: boolean;
  autoupdate?: boolean;
  versionHistory?: VersionHistoryEntry[];
  kind?: AppKind;
  includes?: string[];
  relations?: AppRelations;
  lastResult?: 'success' | 'error';
  lastMessage?: string;
}

export interface VersionHistoryEntry {
  version: string;
  date: string;
  notes?: string;
}

export interface PackageSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  builtin?: boolean;
}

export interface DiskInfo {
  freeMb: number;
  totalMb: number;
}
