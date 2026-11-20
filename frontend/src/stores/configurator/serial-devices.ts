import { serialDeviceId } from './recipes';
import type { SerialDevice } from './types';

// Устройства из конфига wb-mqtt-serial по идентификатору в MQTT; пусто, если конфиг недоступен.
export const loadSerialDevices = async (): Promise<Record<string, SerialDevice>> => {
  try {
    // Сервисы тянут за собой клиент MQTT, поэтому подключаются только при вызове.
    const { serialProxy } = await import('@/services');
    const { config } = await serialProxy.Load({ lang: 'en' });
    const entries = (config?.ports ?? []).flatMap((port: any) => port?.devices ?? [])
      .filter((entry: any) => entry?.device_type && entry.enabled !== false)
      .map((entry: any) => [
        serialDeviceId(entry.device_type, entry.slave_id, entry.id),
        { deviceType: entry.device_type, params: entry },
      ]);
    return Object.fromEntries(entries.filter(([id]) => id));
  } catch {
    return {};
  }
};
