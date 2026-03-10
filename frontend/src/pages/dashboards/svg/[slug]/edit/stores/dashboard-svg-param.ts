import type { SvgDashboardConstructor, SvgEditableParam } from '@/stores/dashboards';

const defaultParam: SvgDashboardConstructor = {
  id: null,
  read: {
    enable: false,
    channel: null,
    value: 'val',
  },
  write: {
    enable: false,
    channel: null,
    value: { on: 1, off: 0 },
  },
  visible: {
    enable: false,
    channel: null,
    condition: '==',
    value: null,
  },
  style: {
    enable: false,
    channel: null,
    value: null,
  },
  click: {
    enable: false,
    dashboard: null,
  },
  'long-press': {
    enable: false,
    dashboard: null,
  },
  'long-press-write': {
    enable: false,
    channel: null,
    value: { on: 1, off: 0 },
  },
};

export class DashboardSvgParam implements SvgDashboardConstructor {
  public id: string | null;
  public read: SvgEditableParam;
  public write: SvgEditableParam;
  public visible: SvgEditableParam;
  public style: SvgEditableParam;
  public click: SvgEditableParam;
  public 'long-press': SvgEditableParam;
  public 'long-press-write': SvgEditableParam;

  constructor(data: Partial<SvgDashboardConstructor> = {}) {
    this.id = data.id ?? null;

    for (const key of Object.keys(defaultParam) as (keyof SvgDashboardConstructor)[]) {
      if (key === 'id') continue;

      this[key] = {
        ...defaultParam[key],
        ...data[key],
      } as SvgEditableParam;
    }
  }
}
