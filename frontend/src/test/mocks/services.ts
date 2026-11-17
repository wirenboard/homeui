import type { Mock } from 'vitest';

export const configEditorProxyMock = {
  List: vi.fn() as Mock,
  Load: vi.fn() as Mock,
  Save: vi.fn() as Mock,
};

export const daliProxyMock = {
  GetList: vi.fn() as Mock,
  GetGateway: vi.fn() as Mock,
  SetGateway: vi.fn() as Mock,
  GetBus: vi.fn() as Mock,
  SetBus: vi.fn() as Mock,
  GetDevice: vi.fn() as Mock,
  SetDevice: vi.fn() as Mock,
  GetGroup: vi.fn() as Mock,
  SetGroup: vi.fn() as Mock,
  ScanBus: vi.fn() as Mock,
  StopScanBus: vi.fn() as Mock,
  IdentifyDevice: vi.fn() as Mock,
  ResetDeviceSettings: vi.fn() as Mock,
  ResetDevice: vi.fn() as Mock,
};

export const daliBusProxyMock = {
  SendCommand: vi.fn() as Mock,
  ListCommands: vi.fn() as Mock,
};

export const deviceManagerProxyMock = {
  Stop: vi.fn() as Mock,
};

export const diagnosticProxyMock = {};

export const editorProxyMock = {
  List: vi.fn() as Mock,
  Load: vi.fn() as Mock,
  Save: vi.fn() as Mock,
  Rename: vi.fn() as Mock,
  ChangeState: vi.fn() as Mock,
  Remove: vi.fn() as Mock,
};

export const fwUpdateProxyMock = {};

export const historyProxyMock = {
  get_values: vi.fn() as Mock,
};

export const logsProxyMock = {
  List: vi.fn() as Mock,
  Load: vi.fn() as Mock,
  CancelLoad: vi.fn() as Mock,
};

export const serialDeviceProxyMock = {};

export const serialPortProxyMock = {};

export const serialProxyMock = {};

export const mqttClientMock = {
  whenConnected: vi.fn(() => Promise.resolve()) as Mock,
  whenReady: vi.fn(() => Promise.resolve()) as Mock,
  isConnected: vi.fn(() => false) as Mock,
  reconnect: vi.fn() as Mock,
  subscribe: vi.fn() as Mock,
  unsubscribe: vi.fn() as Mock,
  publish: vi.fn() as Mock,
  send: vi.fn() as Mock,
  addStickySubscription: vi.fn() as Mock,
};

export const createRpcProxy: Mock = vi.fn();

export {
  configEditorProxyMock as configEditorProxy,
  daliProxyMock as daliProxy,
  daliBusProxyMock as daliBusProxy,
  deviceManagerProxyMock as deviceManagerProxy,
  diagnosticProxyMock as diagnosticProxy,
  editorProxyMock as editorProxy,
  fwUpdateProxyMock as fwUpdateProxy,
  historyProxyMock as historyProxy,
  logsProxyMock as logsProxy,
  serialDeviceProxyMock as serialDeviceProxy,
  serialPortProxyMock as serialPortProxy,
  serialProxyMock as serialProxy,
  mqttClientMock as mqttClient
};
