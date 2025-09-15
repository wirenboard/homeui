export interface WebUiSettingsPageProps {
  onChangeLanguage: (lang: string) => void;
  whenUIConfigReady: () => Promise<void>;
  onChangeDefaultDashboard: (dashboardId: string) => void;
}

export interface Dashboard {
  id: string;
  name: string;
}

export interface CommonSettingsProps {
  onChangeLanguage: (lang: string) => void;
  dashboards: Dashboard[];
  defaultDashboardId: string | null;
  onChangeDefaultDashboard: (dashboardId: string) => void;
}

export interface HttpsStatus {
  enabled: boolean;
}
