export interface WbDeviceTemplateParametersGroup {
  title: string;
  id: string;
  order?: number;
  description?: string;
  group?: string;
  condition?: string;
}

export interface WbDeviceTemplate {
  device_type: string;
  groups: WbDeviceTemplateParametersGroup[];
}
