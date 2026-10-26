/* eslint-disable stylistic/max-len */

import mqtt from 'mqtt';

export const DEFAULT_PREFIX = 'stress-dev-';
export const CHECK_INTERVAL_MS = 50;

export function computeDeviceIntervals({ deviceCount, cellsPerDevice, updatesPerSec }) {
  const avgCellsPerUpdate = Math.max(1, Math.ceil(cellsPerDevice * 0.6));
  const avgDeviceInterval = 1000 * deviceCount * avgCellsPerUpdate / updatesPerSec;

  const deviceIntervals = new Float64Array(deviceCount);
  for (let d = 0; d < deviceCount; d++) {
    deviceIntervals[d] = avgDeviceInterval * (0.3 + Math.random() * 1.4);
  }

  return { avgCellsPerUpdate, avgDeviceInterval, deviceIntervals };
}

export function publishDeviceMeta(client, { deviceCount, cellsPerDevice, prefix = DEFAULT_PREFIX, cellType = undefined }) {
  for (let d = 1; d <= deviceCount; d++) {
    const name = prefix + d;
    client.publish(`/devices/${name}/meta/name`, `Stress Device ${d}`, { retain: true, qos: 1 });
    for (let c = 1; c <= cellsPerDevice; c++) {
      const type = cellType?.(d, c) ?? 'text';
      client.publish(`/devices/${name}/controls/cell_${c}/meta/type`, type, { retain: true, qos: 1 });
      client.publish(`/devices/${name}/controls/cell_${c}/meta/order`, String(c), { retain: true, qos: 1 });
      client.publish(`/devices/${name}/controls/cell_${c}`, '0000', { retain: true, qos: 1 });
    }
  }
}

export function removeDeviceMeta(client, { deviceCount, cellsPerDevice, prefix = DEFAULT_PREFIX }) {
  return new Promise((resolve) => {
    let pending = 0;
    for (let d = 1; d <= deviceCount; d++) {
      const name = prefix + d;
      for (let c = 1; c <= cellsPerDevice; c++) {
        client.publish(`/devices/${name}/controls/cell_${c}`, '', { retain: true, qos: 1 });
        client.publish(`/devices/${name}/controls/cell_${c}/meta/type`, '', { retain: true, qos: 1 });
        client.publish(`/devices/${name}/controls/cell_${c}/meta/order`, '', { retain: true, qos: 1 });
        pending += 3;
      }
      client.publish(`/devices/${name}/meta/name`, '', { retain: true, qos: 1 });
      pending += 1;
    }
    setTimeout(resolve, Math.min(pending * 2, 5000));
  });
}

export function createUpdateLoop(client, {
  deviceCount,
  cellsPerDevice,
  prefix = DEFAULT_PREFIX,
  deviceIntervals,
  checkIntervalMs = CHECK_INTERVAL_MS,
  onPublish,
}) {
  let timer = null;
  const nextUpdate = new Float64Array(deviceCount);

  return {
    start() {
      if (timer) return;

      const now = performance.now();
      for (let d = 0; d < deviceCount; d++) {
        nextUpdate[d] = now + Math.random() * deviceIntervals[d];
      }

      timer = setInterval(() => {
        const tickNow = performance.now();
        for (let d = 0; d < deviceCount; d++) {
          if (tickNow < nextUpdate[d]) continue;

          const name = prefix + (d + 1);
          const cellsToUpdate = 1 + Math.floor(Math.random() * cellsPerDevice);
          const usedCells = new Set();

          for (let i = 0; i < cellsToUpdate; i++) {
            let c;
            do {
              c = 1 + Math.floor(Math.random() * cellsPerDevice);
            } while (usedCells.has(c));
            usedCells.add(c);

            const value = String(Math.floor(Math.random() * 9000) + 1000);
            client.publish(`/devices/${name}/controls/cell_${c}`, value, { qos: 0 });
            onPublish?.();
          }

          nextUpdate[d] = tickNow + deviceIntervals[d] * (0.8 + Math.random() * 0.4);
        }
      }, checkIntervalMs);
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}

function waitForConnect(client, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.removeListener('connect', onConnect);
      client.removeListener('error', onError);
      reject(new Error('MQTT connect timeout'));
    }, timeoutMs);
    function onConnect() {
      clearTimeout(timeout);
      client.removeListener('error', onError);
      resolve();
    }
    function onError(err) {
      clearTimeout(timeout);
      client.removeListener('connect', onConnect);
      reject(err);
    }
    client.once('connect', onConnect);
    client.once('error', onError);
  });
}

export async function startMockDevices({
  broker,
  deviceCount = 400,
  cellsPerDevice = 5,
  updatesPerSec = 300,
  prefix = DEFAULT_PREFIX,
  cellType = undefined,
}) {
  const client = mqtt.connect(broker, {
    clientId: 'mock-devices-' + Math.random().toString(36).slice(2, 8),
    reconnectPeriod: 3000,
    connectTimeout: 10000,
  });

  await waitForConnect(client);

  publishDeviceMeta(client, { deviceCount, cellsPerDevice, prefix, cellType });

  const { deviceIntervals } = computeDeviceIntervals({ deviceCount, cellsPerDevice, updatesPerSec });
  const updateLoop = createUpdateLoop(client, {
    deviceCount, cellsPerDevice, prefix, deviceIntervals,
  });
  updateLoop.start();

  return {
    async stop() {
      updateLoop.stop();
      try {
        await removeDeviceMeta(client, { deviceCount, cellsPerDevice, prefix });
      } finally {
        client.end(true);
      }
    },
  };
}
