import type { CompletionSource } from '@codemirror/autocomplete';
import { Device, commonCellTypes, DeviceStore } from '@/stores/device';

const makeDevTopicsSource = (topics: string[]): CompletionSource => {
  return (context) => {
    const before = context.matchBefore(/dev\[\s*(['"]?)([^'"]*)$/);
    if (!before) {
      return null;
    }

    const quote = before.text.match(/['"]/)?.[0];
    const from = before.from + before.text.lastIndexOf(quote ?? '[') + 1;

    return {
      from,
      to: context.pos,
      options: topics.map((topic) => ({
        label: topic,
        type: 'property',
        apply: quote ? topic : `"${topic}"`,
      })),
    };
  };
};

const makeGetDeviceSource = (devices: string[]): CompletionSource => {
  return (context) => {
    const before = context.matchBefore(/getDevice\(\s*(['"]?)([^'"]*)$/);
    if (!before) {
      return null;
    }

    const quote = before.text.match(/['"]/)?.[0];
    const from = before.from + before.text.lastIndexOf(quote ?? '(') + 1;

    return {
      from,
      to: context.pos,
      options: devices.map((dev) => ({
        label: dev,
        type: 'variable',
        apply: quote ? dev : `"${dev}"`,
      })),
    };
  };
};

const makeGetControlSource = (
  devices: Map<string, Device>,
  topics: string[] = []
): CompletionSource => {
  return (context) => {
    const before = context.matchBefore(/(?:getDevice\(\s*(['"])([^'"]+)\1\)\.)?getControl\(\s*(['"]?)([^'"]*)$/);
    if (!before) return null;

    const m = before.text.match(/(?:getDevice\(\s*(['"])([^'"]+)\1\)\.)?getControl\(\s*(['"]?)([^'"]*)$/);
    if (!m) {
      return null;
    }

    const deviceId = m[2] || null;
    const quote = m[3] || null;

    let controls = [];
    if (!deviceId) {
      controls = topics;
    } else if (devices.get(deviceId)) {
      controls = devices.get(deviceId)!.getControls();
    }

    return {
      from: before.from + before.text.lastIndexOf(quote ?? '(') + 1,
      to: context.pos,
      options: controls.map((label) => ({
        label,
        type: 'property',
        apply: quote ? label : `"${label}"`,
      })),
    };
  };
};

const typeCompletionSource: CompletionSource = (context) => {
  const before = context.matchBefore(/(['"]?type['"]?\s*:\s*)(['"]?)([\w-]*)?$/);
  if (!before) {
    return null;
  }

  const match = before.text.match(/:\s*(['"]?)/);
  const quote = match ? match[1] : null;

  const from = before.from + before.text.lastIndexOf(quote || ':') + 1;

  return {
    from,
    to: context.pos,
    options: Array.from(commonCellTypes.keys()).map((label) => ({ label, type: 'enum' }))
      .map((c) => ({
        ...c,
        apply: quote ? c.label : ` "${c.label}"`,
      })),
  };
};

const makeTopicSource = (fnName: string, topics: string[]): CompletionSource => {
  return (context) => {
    const before = context.matchBefore(
      new RegExp(`${fnName}\\(\\s*(['"]?)([^'",)]*)$`)
    );
    if (!before) {
      return null;
    }

    const m = before.text.match(/['"]/);
    const quote = m ? m[0] : null;
    const from = before.from + before.text.lastIndexOf(quote || '(') + 1;

    return {
      from,
      to: context.pos,
      options: topics.map((topic) => ({
        label: topic,
        type: 'variable',
        apply: quote ? topic : `"${topic}"`,
      })),
    };
  };
};

export const getEnums = (devicesStore: DeviceStore) => {
  const devices = Array.from(devicesStore.devices.keys());
  const topics = devicesStore.controls.map(({ id }) => id);

  return [
    typeCompletionSource,
    makeGetDeviceSource(devices),
    makeGetControlSource(devicesStore.devices, topics),
    makeDevTopicsSource(topics),
    makeTopicSource('publish', topics),
    makeTopicSource('trackMqtt', topics),
  ];
};
