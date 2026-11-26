import MatterStore from './matter-store';

export * from './api';
export * from './types';
export { POLL_INTERVAL_MS } from './matter-store';

const matterStore = new MatterStore();

export {
  MatterStore, matterStore
};
