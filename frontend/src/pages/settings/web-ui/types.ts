import { DashboardsStore } from '@/stores/dashboards';

export interface WebUiSettingsPageProps {
  onChangeLanguage: (lang: string) => void;
  dashboardsStore: DashboardsStore;
  userType: 'admin' | 'operator' | 'user';
}

export interface CommonSettingsProps {
  onChangeLanguage: (lang: string) => void;
  dashboardsStore: DashboardsStore;
}

export interface HttpsSettingsProps {
  onError: (error: string) => void;
}
