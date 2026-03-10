import { type SvgElementBindingsStore } from '@/pages/dashboards/svg/[slug]/edit/stores/svg-element-bindings-store';
import { type DashboardsStore, type ParamAction } from '@/stores/dashboards';
import { type DeviceOption } from '@/stores/devices/types';

export interface VisualBindingsEditorProps {
  store: SvgElementBindingsStore;
  dashboardsStore: DashboardsStore;
  devices: DeviceOption[];
}

export interface VisibleBindingFormProps {
  store: SvgElementBindingsStore;
  devices: DeviceOption[];
}

export interface ParamBindingFormProps {
  paramName: ParamAction;
  store: SvgElementBindingsStore;
  devices: DeviceOption[];
}

export interface ClickBindingFormProps {
  clickParamName: ParamAction;
  writeParamName: ParamAction;
  title: string;
  store: SvgElementBindingsStore;
  dashboardsStore: DashboardsStore;
  writeDefault?: boolean;
  devices: DeviceOption[];
}
