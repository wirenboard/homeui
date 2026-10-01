import CloudStatusStore, { ConnectionStatus } from './store';

describe('CloudStatusStore with the agent stopped', () => {
  test('an empty status, the cleared retained topic, reads as "not running"', () => {
    const store = new CloudStatusStore('wb');

    store.updateStatus('' as ConnectionStatus);

    expect(store.initialized).toBe(true);
    expect(store.status).toBe(ConnectionStatus.Stopped);
  });

  test('a real status is kept as is', () => {
    const store = new CloudStatusStore('wb');

    store.updateStatus(ConnectionStatus.Connected);

    expect(store.status).toBe(ConnectionStatus.Connected);
  });

  test.each(['unknown', ''])('activation link %j means there is no link', (payload) => {
    const store = new CloudStatusStore('wb');
    store.updateActivationLink('https://activate.wb/token');

    store.updateActivationLink(payload);

    expect(store.initialized).toBe(true);
    expect(store.activationLink).toBeNull();
  });

  test('a cleared cloud URL keeps the last known link to the controller page', () => {
    const store = new CloudStatusStore('wb');
    store.updateSerialNum('ABC');
    store.updateCloudBaseUrl('https://cloud.wb');

    store.updateCloudBaseUrl('');

    expect(store.cloudLink).toBe('https://cloud.wb/controllers/ABC');
  });
});
