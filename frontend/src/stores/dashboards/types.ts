export interface UIConfigResponse {
  content: {
    dashboards: DashboardBase[];
    defaultDashboardId: string;
    widgets: WidgetBase[];
  };
}

export interface TextDashboard {
  id: string;
  name: string;
  isSvg: boolean;
  widgets: string[];
  options?: {
    isHidden?: boolean;
  };
}

interface SvgDashboard {
  svg: {
    current: string;
    original: {};
    params: [];
  };
  svg_fullwidth: boolean;
  svg_url: string;
  swipe: {
    enable: boolean;
    left: string | null;
    right: string | null;
  };
}

export type DashboardBase = TextDashboard & Partial<SvgDashboard>;

interface WidgetCell {
  id: string;
  name: string;
  type?: string;
  extra: {
    invert?: boolean;
  };
}

export interface WidgetBase {
  id: string;
  name: string;
  compact: boolean;
  description: string;
  cells: WidgetCell[];
}
