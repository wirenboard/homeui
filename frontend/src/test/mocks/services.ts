export const configEditorProxyMock = {
  List: vi.fn(),
  Load: vi.fn(),
  Save: vi.fn(),
};

export const daliProxyMock = {
  GetList: vi.fn(),
  GetGateway: vi.fn(),
  SetGateway: vi.fn(),
  GetBus: vi.fn(),
  SetBus: vi.fn(),
  GetDevice: vi.fn(),
  SetDevice: vi.fn(),
  GetGroup: vi.fn(),
  SetGroup: vi.fn(),
  ScanBus: vi.fn(),
  StopScanBus: vi.fn(),
  IdentifyDevice: vi.fn(),
  ResetDeviceSettings: vi.fn(),
  ResetDevice: vi.fn(),
};

export const daliBusProxyMock = {
  SendCommand: vi.fn(),
  ListCommands: vi.fn(),
};

export const deviceManagerProxyMock = {
  Stop: vi.fn(),
};

export const diagnosticProxyMock = {};

export const editorProxyMock = {
  List: vi.fn(),
  Load: vi.fn(),
  Save: vi.fn(),
  Rename: vi.fn(),
  ChangeState: vi.fn(),
  Remove: vi.fn(),
};

export const fwUpdateProxyMock = {};

export const historyProxyMock = {
  get_values: vi.fn(),
};

export const logsProxyMock = {
  List: vi.fn(),
  Load: vi.fn(),
  CancelLoad: vi.fn(),
};

export const serialDeviceProxyMock = {};

export const serialPortProxyMock = {};

export const serialProxyMock = {};

export const mqttClientMock = {
  whenConnected: vi.fn(() => Promise.resolve()),
  whenReady: vi.fn(() => Promise.resolve()),
  isConnected: vi.fn(() => false),
  reconnect: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  publish: vi.fn(),
  send: vi.fn(),
  addStickySubscription: vi.fn(),
};

export const createRpcProxy = vi.fn();

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
