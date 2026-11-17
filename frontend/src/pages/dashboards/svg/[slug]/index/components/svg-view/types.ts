import type { SvgEditableParam, SvgDashboardConstructor } from '@/stores/dashboards';

export interface SvgViewProps {
  svg: string;
  params: Partial<SvgDashboardConstructor>[];
  id: string;
  currentDashboard: string;
  confirmHandler: () => Promise<any>;
  values: Object;
  className: string;
  onSwitchValue: (_channel: string, _val: string) => void;
  onMoveToDashboard: (_id: string) => void;
}

export type { SvgEditableParam as ParamProps };
