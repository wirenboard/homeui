import { Aedes } from 'aedes';
import { createServer } from 'aedes-server-factory';

export async function startMockBroker({ port = 0 } = {}) {
  const aedes = await Aedes.createBroker();
  const server = createServer(aedes, { ws: true });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  const { port: boundPort } = server.address();

  return {
    url: `ws://127.0.0.1:${boundPort}`,
    aedes,
    stop() {
      return new Promise((resolve) => {
        server.close(() => {
          aedes.close(() => resolve());
        });
      });
    },
  };
}

const HISTORY_RPC_TOPIC = /^\/rpc\/v1\/db_logger\/history\/get_values\/[^/]+$/;

export function mockHistoryRpc(aedes, { pointsPerChannel = 1000 } = {}) {
  const handler = (packet) => {
    if (!HISTORY_RPC_TOPIC.test(packet.topic)) return;

    let request;
    try {
      request = JSON.parse(packet.payload.toString());
    } catch {
      return;
    }

    const limit = Math.min(request.params?.limit ?? pointsPerChannel, pointsPerChannel);
    const { gt, lt } = request.params?.timestamp ?? {};
    const start = gt ?? Date.now() / 1000 - 3600;
    const end = lt ?? Date.now() / 1000;
    const step = (end - start) / Math.max(limit, 1);

    const values = Array.from({ length: limit }, (_, i) => ({
      t: start + i * step,
      v: Math.round(Math.random() * 1000) / 10,
      min: null,
      max: null,
      retain: false,
      i: 0,
      c: 0,
    }));

    aedes.publish({
      topic: `${packet.topic}/reply`,
      payload: Buffer.from(JSON.stringify({ id: request.id, result: { values } })),
      qos: 0,
      retain: false,
    }, () => {});
  };

  aedes.on('publish', handler);
  return () => aedes.removeListener('publish', handler);
}
