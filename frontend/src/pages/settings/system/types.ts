import { type MqttClient } from '@/common/types';

export interface SystemPageProps {
  mqttClient: MqttClient;
  whenMqttReady: () => Promise<any>;
  diagnosticProxy: any;
}
