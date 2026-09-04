export const splitTopic = (topic: string) => {
  const parts = topic.substring(1).split('/');
  return { deviceId: parts[1], cellId: `${parts[1]}/${parts[3]}` };
};

const topicRegexCache = new Map<string, RegExp>();

export const isTopicsAreEqual = (realTopic: string, topicExp: string) => {
  let reg = topicRegexCache.get(topicExp);
  if (!reg) {
    reg = new RegExp(`^${topicExp.replace(/\+/g, '[^/]+').replace(/#/g, '.*')}$`);
    topicRegexCache.set(topicExp, reg);
  }
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
