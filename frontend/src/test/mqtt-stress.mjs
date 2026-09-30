#!/usr/bin/env node

/* eslint-disable */
/**
 * MQTT frontend stress-test — runs on your laptop, publishes directly to the
 * broker, bypassing wb-rules entirely. The controller only relays messages.
 *
 * Simulates realistic device behavior: each device has its own update interval
 * (some fast, some slow), updates a random subset of cells each time, with
 * timing jitter. Devices fire independently, not in sync.
 *
 * Usage:
 *   node src/test/mqtt-stress.mjs [devices] [cells] [updates_per_sec] [broker]
 *   or
 *   bun src/test/mqtt-stress.mjs [devices] [cells] [updates_per_sec] [broker]
 *
 * Examples:
 *   node src/test/mqtt-stress.mjs                                # 400 devices, 5 cells, 300 upd/sec
 *   node src/test/mqtt-stress.mjs 400 5 300                      # same explicitly
 *   node src/test/mqtt-stress.mjs 100 10 5000                    # 100 devices, 10 cells, 5k upd/sec
 *   node src/test/mqtt-stress.mjs 400 5 300 mqtt://10.0.0.1:1883 # custom broker
 *
 * Real-world reference: 400 devices × ~64 cells max, ~300 topic updates/sec.
 * Broker limit (ARM): ~10,000 msg/sec causes reconnects.
 *
 * Ctrl+C to stop — cleans up test devices from the broker.
 */
import mqtt from 'mqtt';

const DEVICE_COUNT = parseInt(process.argv[2]) || 400;
const CELLS_PER_DEVICE = parseInt(process.argv[3]) || 5;
const UPDATES_PER_SEC = parseInt(process.argv[4]) || 300;
const BROKER_URL = process.argv[5] || 'mqtt://192.168.1.39:1883';
const PREFIX = 'stress-dev-';
const TOTAL_CELLS = DEVICE_COUNT * CELLS_PER_DEVICE;
const CHECK_INTERVAL_MS = 50;

let client;
let updateTimer;
let statsTimer;
let devicesCreated = false;
let sentCount = 0;
let lastReportSent = 0;
let lastReportTime = Date.now();
let reconnects = 0;

const avgCellsPerUpdate = Math.max(1, Math.ceil(CELLS_PER_DEVICE * 0.6));
const avgDeviceInterval = 1000 * DEVICE_COUNT * avgCellsPerUpdate / UPDATES_PER_SEC;

const deviceIntervals = new Float64Array(DEVICE_COUNT);
const nextUpdate = new Float64Array(DEVICE_COUNT);

for (let d = 0; d < DEVICE_COUNT; d++) {
  deviceIntervals[d] = avgDeviceInterval * (0.3 + Math.random() * 1.4);
}

function createDevices() {
  console.log(`Creating ${DEVICE_COUNT} devices with ${CELLS_PER_DEVICE} cells each (${TOTAL_CELLS} total)...`);
  for (let d = 1; d <= DEVICE_COUNT; d++) {
    const name = PREFIX + d;
    client.publish(`/devices/${name}/meta/name`, `Stress Device ${d}`, { retain: true, qos: 1 });
    for (let c = 1; c <= CELLS_PER_DEVICE; c++) {
      client.publish(`/devices/${name}/controls/cell_${c}/meta/type`, 'text', { retain: true, qos: 1 });
      client.publish(`/devices/${name}/controls/cell_${c}/meta/order`, String(c), { retain: true, qos: 1 });
      client.publish(`/devices/${name}/controls/cell_${c}`, '0000', { retain: true, qos: 1 });
    }
  }
  console.log('Devices created.');
}

function startUpdates() {
  if (updateTimer) return;

  const now = performance.now();
  for (let d = 0; d < DEVICE_COUNT; d++) {
    nextUpdate[d] = now + Math.random() * deviceIntervals[d];
  }

  console.log(`\nStarting updates: target ~${UPDATES_PER_SEC} updates/sec`);
  console.log(`  Avg device interval: ${Math.round(avgDeviceInterval)}ms (range: ${Math.round(avgDeviceInterval * 0.3)}-${Math.round(avgDeviceInterval * 1.7)}ms)`);
  console.log(`  Avg cells per update: ~${avgCellsPerUpdate} of ${CELLS_PER_DEVICE}\n`);

  updateTimer = setInterval(() => {
    const now = performance.now();
    for (let d = 0; d < DEVICE_COUNT; d++) {
      if (now < nextUpdate[d]) continue;

      const name = PREFIX + (d + 1);
      const cellsToUpdate = 1 + Math.floor(Math.random() * CELLS_PER_DEVICE);
      const usedCells = new Set();

      for (let i = 0; i < cellsToUpdate; i++) {
        let c;
        do {
          c = 1 + Math.floor(Math.random() * CELLS_PER_DEVICE);
        } while (usedCells.has(c));
        usedCells.add(c);

        const value = String(Math.floor(Math.random() * 9000) + 1000);
        client.publish(`/devices/${name}/controls/cell_${c}`, value, { qos: 0 });
        sentCount++;
      }

      nextUpdate[d] = now + deviceIntervals[d] * (0.8 + Math.random() * 0.4);
    }
  }, CHECK_INTERVAL_MS);
}

function printStats() {
  const now = Date.now();
  const elapsed = (now - lastReportTime) / 1000;
  const rate = Math.round((sentCount - lastReportSent) / elapsed);
  const reconInfo = reconnects > 0 ? ` | reconnects: ${reconnects}` : '';
  process.stdout.write(`\r  ${sentCount} sent | ${rate} msg/sec | ${DEVICE_COUNT} dev × ${CELLS_PER_DEVICE} cells${reconInfo}  `);
  lastReportSent = sentCount;
  lastReportTime = now;
}

function removeDevices() {
  return new Promise((resolve) => {
    console.log('\n\nCleaning up test devices...');
    let pending = 0;
    for (let d = 1; d <= DEVICE_COUNT; d++) {
      const name = PREFIX + d;
      for (let c = 1; c <= CELLS_PER_DEVICE; c++) {
        client.publish(`/devices/${name}/controls/cell_${c}`, '', { retain: true, qos: 1 });
        client.publish(`/devices/${name}/controls/cell_${c}/meta/type`, '', { retain: true, qos: 1 });
        client.publish(`/devices/${name}/controls/cell_${c}/meta/order`, '', { retain: true, qos: 1 });
        pending += 3;
      }
      client.publish(`/devices/${name}/meta/name`, '', { retain: true, qos: 1 });
      pending += 1;
    }
    setTimeout(() => {
      console.log(`Removed ${DEVICE_COUNT} devices (${pending} messages).`);
      resolve();
    }, Math.min(pending * 2, 5000));
  });
}

function waitForConnection(timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    if (client.connected) {
      resolve();
      return;
    }
    console.log('  Waiting for reconnect to clean up...');
    const timeout = setTimeout(() => {
      client.removeListener('connect', onConnect);
      reject(new Error('Reconnect timeout'));
    }, timeoutMs);
    function onConnect() {
      clearTimeout(timeout);
      resolve();
    }
    client.once('connect', onConnect);
  });
}

let shuttingDown = false;

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }
  if (statsTimer) {
    clearInterval(statsTimer);
    statsTimer = null;
  }
  if (client) {
    try {
      await waitForConnection();
      await removeDevices();
    } catch (err) {
      console.error(`\n  Cleanup failed: ${err.message}. Devices may remain on broker.`);
    }
    client.end(true);
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('MQTT Stress Test (realistic)');
console.log(`  Broker:      ${BROKER_URL}`);
console.log(`  Devices:     ${DEVICE_COUNT}`);
console.log(`  Cells:       ${CELLS_PER_DEVICE} per device (${TOTAL_CELLS} total)`);
console.log(`  Target rate: ~${UPDATES_PER_SEC} updates/sec`);
console.log('  Connecting...');

client = mqtt.connect(BROKER_URL, {
  clientId: 'stress-test-' + Math.random().toString(36).slice(2, 8),
  reconnectPeriod: 3000,
  connectTimeout: 10000,
});

client.on('connect', () => {
  if (!devicesCreated) {
    console.log('  Connected!\n');
    createDevices();
    devicesCreated = true;
    setTimeout(() => {
      startUpdates();
      statsTimer = setInterval(printStats, 1000);
    }, 2000);
  } else {
    reconnects++;
    console.log(`\n  Reconnected (#${reconnects}), resuming updates...`);
    startUpdates();
  }
});

client.on('error', (err) => {
  console.error('MQTT error:', err.message);
});

client.on('close', () => {
  if (updateTimer) {
    console.log('\n  Connection lost, pausing updates.');
    clearInterval(updateTimer);
    updateTimer = null;
  }
});
