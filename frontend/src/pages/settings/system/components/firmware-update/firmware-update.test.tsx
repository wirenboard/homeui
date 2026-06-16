// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { FirmwareUpdate } from './firmware-update';
import { ModalMode } from './types';

vi.mock('@rpldy/uploady', () => ({
  default: ({ children }: any) => <div data-testid="uploady">{children}</div>,
  useRequestPreSend: vi.fn(),
  useItemStartListener: vi.fn(),
  useItemFinishListener: vi.fn(),
  useItemProgressListener: vi.fn(),
  useItemErrorListener: vi.fn(),
}));
vi.mock('@/common/links', () => ({ releases: '#releases' }));
vi.mock('@/components/alert', () => ({
  Alert: ({ children, variant, onClose }: any) => (
    <div data-testid="alert" data-variant={variant}>
      {children}
      {onClose && <button data-testid="alert-close" onClick={onClose} />}
    </div>
  ),
}));
vi.mock('@/components/button', () => ({
  Button: ({ label, variant, onClick, disabled }: any) => (
    <button
      data-testid={`btn-${variant || 'default'}`}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  ),
}));
vi.mock('@/components/card', () => ({
  Card: ({ heading, children }: any) => (
    <div><h2>{heading}</h2>{children}</div>
  ),
}));
vi.mock('@/components/checkbox', () => ({
  Checkbox: ({ title, checked, onChange }: any) => (
    <label>
      <input
        type="checkbox"
        data-testid="rootfs-checkbox"
        checked={checked}
        onChange={() => onChange(!checked)}
      />
      {title}
    </label>
  ),
}));
vi.mock('@/components/progress', () => ({
  Progress: ({ value, caption }: any) => (
    <div data-testid="progress">{caption} {value}%</div>
  ),
}));
vi.mock('./components/download-backup-modal', () => ({
  DownloadBackupModal: ({ isOpened, onCancel }: any) =>
    isOpened ? (
      <div data-testid="download-modal">
        <button data-testid="close-download" onClick={onCancel}>close</button>
      </div>
    ) : null,
}));
vi.mock('./components/factory-reset-modal', () => ({
  FactoryResetModal: ({ isOpened, onCancel, mode }: any) =>
    isOpened ? (
      <div data-testid="factory-modal" data-mode={mode}>
        <button data-testid="close-factory" onClick={onCancel}>close</button>
      </div>
    ) : null,
}));

const createStore = (overrides = {}) => ({
  expandRootfs: true,
  isRootfsExpanded: false,
  activeMode: null as any,
  inProgress: false,
  receivedFirstStatus: true,
  stateMsg: '',
  isDone: false,
  error: null,
  stateType: '',
  progressPercents: 0,
  factoryResetFitsState: { canDoFactoryReset: true },
  clearTimeouts: vi.fn(),
  onUploadStart: vi.fn(),
  onUploadProgress: vi.fn(),
  onUploadFinish: vi.fn(),
  onUploadError: vi.fn(),
  setExpandRootfs: vi.fn(),
  onDoneClick: vi.fn(),
  ...overrides,
});

describe('FirmwareUpdate', () => {
  test('wraps in Uploady', () => {
    render(<FirmwareUpdate store={createStore() as any} mode="update" />);
    expect(screen.getByTestId('uploady')).toBeDefined();
  });

  describe('update mode', () => {
    test('renders title', () => {
      render(<FirmwareUpdate store={createStore() as any} mode="update" />);
      expect(screen.getByText('system.update.title')).toBeDefined();
    });

    test('renders select button', () => {
      render(<FirmwareUpdate store={createStore() as any} mode="update" />);
      expect(screen.getByText('system.buttons.select')).toBeDefined();
    });

    test('renders help link', () => {
      render(<FirmwareUpdate store={createStore() as any} mode="update" />);
      expect(screen.getByText('system.update.help')).toBeDefined();
    });

    test('renders rootfs checkbox when not expanded', () => {
      render(<FirmwareUpdate store={createStore() as any} mode="update" />);
      expect(screen.getByText('system.update.expandrootfs')).toBeDefined();
    });

    test('hides rootfs checkbox when already expanded', () => {
      const store = createStore({ isRootfsExpanded: true });
      render(<FirmwareUpdate store={store as any} mode="update" />);
      expect(screen.queryByText('system.update.expandrootfs')).toBeNull();
    });

    test('rootfs checkbox toggles setExpandRootfs', () => {
      const store = createStore();
      render(<FirmwareUpdate store={store as any} mode="update" />);
      fireEvent.click(screen.getByTestId('rootfs-checkbox'));
      expect(store.setExpandRootfs).toHaveBeenCalledWith(false);
    });

    test('shows unavailable when no first status', () => {
      const store = createStore({ receivedFirstStatus: false });
      render(<FirmwareUpdate store={store as any} mode="update" />);
      expect(screen.getByText('system.errors.unavailable')).toBeDefined();
    });

    test('clicking select opens download backup modal', () => {
      render(<FirmwareUpdate store={createStore() as any} mode="update" />);
      fireEvent.click(screen.getByText('system.buttons.select'));
      expect(screen.getByTestId('download-modal')).toBeDefined();
    });

    test('closing modal hides it', () => {
      render(<FirmwareUpdate store={createStore() as any} mode="update" />);
      fireEvent.click(screen.getByText('system.buttons.select'));
      fireEvent.click(screen.getByTestId('close-download'));
      expect(screen.queryByTestId('download-modal')).toBeNull();
    });
  });

  describe('reset mode', () => {
    test('renders title', () => {
      render(<FirmwareUpdate store={createStore() as any} mode="reset" />);
      expect(screen.getByText('system.factory_reset.title')).toBeDefined();
    });

    test('renders warnings', () => {
      render(<FirmwareUpdate store={createStore() as any} mode="reset" />);
      expect(screen.getByText('system.factory_reset.warning1')).toBeDefined();
      expect(screen.getByText('system.factory_reset.warning2')).toBeDefined();
    });

    test('renders select_and_reset button', () => {
      render(<FirmwareUpdate store={createStore() as any} mode="reset" />);
      const btns = screen.getAllByTestId('btn-danger');
      expect(btns.length).toBeGreaterThanOrEqual(1);
    });

    test('renders factory reset button when canDoFactoryReset', () => {
      render(<FirmwareUpdate store={createStore() as any} mode="reset" />);
      expect(screen.getByText('system.buttons.reset')).toBeDefined();
    });

    test('hides factory reset button when canDoFactoryReset false', () => {
      const store = createStore({
        factoryResetFitsState: { canDoFactoryReset: false },
      });
      render(<FirmwareUpdate store={store as any} mode="reset" />);
      expect(screen.queryByText('system.buttons.reset')).toBeNull();
    });

    test('hides warning2 when canDoFactoryReset false', () => {
      const store = createStore({
        factoryResetFitsState: { canDoFactoryReset: false },
      });
      render(<FirmwareUpdate store={store as any} mode="reset" />);
      expect(screen.queryByText('system.factory_reset.warning2')).toBeNull();
    });

    test('shows unavailable when no first status', () => {
      const store = createStore({ receivedFirstStatus: false });
      render(<FirmwareUpdate store={store as any} mode="reset" />);
      expect(screen.getByText('system.errors.unavailable')).toBeDefined();
    });

    test('clicking first button opens UpdateReset modal', () => {
      render(<FirmwareUpdate store={createStore() as any} mode="reset" />);
      fireEvent.click(screen.getAllByTestId('btn-danger')[0]);
      expect(screen.getByTestId('factory-modal').dataset.mode).toBe(
        ModalMode.UpdateReset,
      );
    });

    test('clicking reset button opens FactoryReset modal', () => {
      render(<FirmwareUpdate store={createStore() as any} mode="reset" />);
      fireEvent.click(screen.getAllByTestId('btn-danger')[1]);
      expect(screen.getByTestId('factory-modal').dataset.mode).toBe(
        ModalMode.FactoryReset,
      );
    });
  });

  describe('progress and done', () => {
    test('shows progress when inProgress and mode matches', () => {
      const store = createStore({
        inProgress: true,
        activeMode: 'update',
        stateMsg: 'system.states.uploading',
        progressPercents: 50,
      });
      render(<FirmwareUpdate store={store as any} mode="update" />);
      expect(screen.getByTestId('progress')).toBeDefined();
    });

    test('shows done alert when isDone', () => {
      const store = createStore({
        inProgress: true,
        activeMode: 'update',
        isDone: true,
        stateMsg: 'system.states.complete',
      });
      render(<FirmwareUpdate store={store as any} mode="update" />);
      expect(screen.getByTestId('alert')).toBeDefined();
      expect(screen.getByText('system.states.complete')).toBeDefined();
    });

    test('done alert close calls onDoneClick', () => {
      const store = createStore({
        inProgress: true,
        activeMode: 'update',
        isDone: true,
        stateMsg: 'system.states.complete',
      });
      render(<FirmwareUpdate store={store as any} mode="update" />);
      fireEvent.click(screen.getByTestId('alert-close'));
      expect(store.onDoneClick).toHaveBeenCalled();
    });

    test('shows danger variant on error', () => {
      const store = createStore({
        inProgress: true,
        activeMode: 'update',
        isDone: true,
        error: 'some error',
        stateMsg: 'system.states.upload_error',
      });
      render(<FirmwareUpdate store={store as any} mode="update" />);
      expect(screen.getByTestId('alert').dataset.variant).toBe('danger');
    });
  });
});
