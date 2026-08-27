import type { CompletionSource } from '@codemirror/autocomplete';
import { type Device, commonCellTypes, type DevicesStore } from '@/stores/devices';

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

// getDevice("X").getControl(" -> device X's live controls (getDevice is not typed per
// device); getControl(" -> full "dev/ctrl" refs. A call on a variable (vdev.getControl(")
// is left to the TS service, which knows the variable's device type.
const GET_CONTROL_RE =
  /(?:getDevice\(\s*(['"])([^'"]+)\1\)|([A-Za-z_$][\w$]*))?(\s*\.\s*)?getControl\(\s*(['"]?)([^'"]*)$/;

const makeGetControlSource = (
  devices: Map<string, Device>,
  topics: string[] = [],
): CompletionSource => {
  return (context) => {
    const before = context.matchBefore(GET_CONTROL_RE);
    if (!before) return null;

    const m = before.text.match(GET_CONTROL_RE);
    if (!m) {
      return null;
    }

    const deviceId = m[2] || null;
    const identReceiver = m[3] || null;
    const dot = m[4] || null;
    const quote = m[5] || null;

    if (identReceiver && dot) return null;

    let controls: string[] = [];
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
      new RegExp(`${fnName}\\(\\s*(['"]?)([^'",)]*)$`),
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

export const getEnums = (devicesStore: DevicesStore) => {
  // read the store at completion time, not at build: the extension array is memoized
  // upstream and devices keep arriving over MQTT long after that
  const topics = () => devicesStore.topicsWithoutSystem.flatMap((g) => g.options.map((o) => o.value));
  const live = (build: () => CompletionSource): CompletionSource => (context) => build()(context);

  return [
    typeCompletionSource,
    live(() => makeGetDeviceSource(Array.from(devicesStore.devices.keys()))),
    live(() => makeGetControlSource(devicesStore.devices, topics())),
    live(() => makeDevTopicsSource(topics())),
    live(() => makeTopicSource('publish', topics())),
    live(() => makeTopicSource('trackMqtt', topics())),
  ];
};
