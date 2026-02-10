export interface ParamProps {
  enable: boolean;
  channel?: string;
  value?: any;
  check?: boolean;
  dashboard?: string;
  condition?: string;
}

interface Param {
  read: ParamProps;
  write: ParamProps;
  click: ParamProps;
  style: ParamProps;
  visible: ParamProps;
  'long-press': ParamProps;
  'long-press-write': ParamProps;
  id: string;
}

export interface SvgViewProps {
  svg: string;
  params: Param[];
  id: string;
  currentDashboard: string;
  confirmHandler: () => Promise<any>;
  values: Object;
  className: string;
  onSwitchValue: (_channel: string, _val: string) => void;
  onMoveToDashboard: (_id: string) => void;
}
