export interface DashboardBase {
  id: string;
  name: string;
  isSvg: boolean;
  widgets: string[];
}

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
