// Temporary solution for typing unupdated methods

type SubscriptionCallback = (data: { topic: string; payload: string }) => void;

export interface MqttClient {
  send: (_topic: string, _message: string, _retained: boolean, _qos?: number) => Promise<void>;
  addStickySubscription: (_topic: string, _callback: SubscriptionCallback) => Promise<void>;
}
