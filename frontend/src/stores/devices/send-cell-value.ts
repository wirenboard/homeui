import { mqttClient } from '@/services';

/**
 * Publish a control write the way every WB daemon expects it — non-retained,
 * on the `/on` command topic. The one spelling of that topic, shared by
 * DevicesStore and the DALI page's embedded controls.
 */
export async function sendCellValueUpdate(deviceId: string, controlId: string, value: string) {
  await mqttClient.send(`/devices/${deviceId}/controls/${controlId}/on`, value, false);
}
