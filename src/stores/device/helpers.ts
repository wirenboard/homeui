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
