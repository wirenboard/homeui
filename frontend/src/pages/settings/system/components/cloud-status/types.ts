import type { MqttClient } from '@/common/types';

export interface CloudStatusProps {
  className: string;
  mqttClient: MqttClient;
  whenMqttReady: () => Promise<void>;
}
