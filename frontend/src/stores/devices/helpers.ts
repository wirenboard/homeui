export const splitTopic = (topic: string) => {
  const parts = topic.substring(1).split('/');
  return { deviceId: parts[1], cellId: `${parts[1]}/${parts[3]}` };
};

// method to comparing real topic ('/devices/deviceId/controls/controlId/meta/name')
// and topicExpression - topic with characters '+' or '#' ('/devices/+/controls/#')
export const isTopicsAreEqual = (realTopic: string, topicExp: string) => {
  const reg = new RegExp(`^${topicExp.replace(/\+/g, '[^/]+').replace(/#/g, '.*')}$`);
  return reg.test(realTopic);
};

export const getFoldedDevices = (): string[] => {
  try {
    const stored = localStorage.getItem('foldedDevices');
    if (stored !== null){
      return JSON.parse(stored);
    }
  } catch (error) {}
  return [];
};

const SYSTEM_DEVICE_IDS = [
  'alarms',
  'buzzer',
  'hwmon',
  'knx',
  'metrics',
  'network',
  'power_status',
  'system',
  'system_time',
  'wbrules',
  'wb-adc',
  'wb-gpio',
  'wb-w1',
];

export const isDefaultSystemDevice = (id: string): boolean => {
  return SYSTEM_DEVICE_IDS.includes(id);
};
