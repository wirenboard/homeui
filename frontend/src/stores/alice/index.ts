import AliceStore from './alice-store';

export * from './constants';
export * from './defaults';
export * from './types';

const aliceStore = new AliceStore();

export {
  aliceStore
};
