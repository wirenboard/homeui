// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModalMode } from '../../types';
import { FactoryResetModal } from './factory-reset-modal';

vi.mock('react-i18next', () => {
  const t = (key: string) => key;
  return {
    useTranslation: () => ({ t, i18n: { language: 'en', changeLanguage: vi.fn(), t } }),
    Trans: ({ i18nKey, children }: any) => i18nKey || children,
  };
});

const { requestMock } = vi.hoisted(() => ({
  requestMock: { post: vi.fn(() => Promise.resolve()) },
}));

vi.mock('@/utils/request', () => ({ request: requestMock }));
vi.mock('@/components/button', () => ({
  Button: ({ label, onClick, disabled }: any) => (
    <button data-testid="btn" disabled={disabled} onClick={onClick}>
      {label}
    </button>
  ),
}));
vi.mock('@/components/dialog', () => ({
  Dialog: ({ heading, isOpened, onClose, children }: any) =>
    isOpened ? (
      <div data-testid="dialog">
        <h2>{heading}</h2>
        {children}
        <button data-testid="dialog-close" onClick={onClose}>x</button>
      </div>
    ) : null,
}));
vi.mock('@/components/input', () => ({
  Input: ({ value, onChange }: any) => (
    <input
      data-testid="confirm-input"
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
    />
  ),
}));
vi.mock('../upload-button', () => ({
  UploadButton: ({ label, onClick, disabled }: any) => (
    <button data-testid="upload-btn" disabled={disabled} onClick={onClick}>
      {label}
    </button>
  ),
}));

const createStore = () => ({
  activeMode: null as any,
  onUploadStart: vi.fn(),
  onUploadFinish: vi.fn(),
  onUploadError: vi.fn((_e: any) => {}),
});

describe('FactoryResetModal', () => {
  const baseProps = () => ({
    isOpened: true,
    onCancel: vi.fn(),
    mode: ModalMode.UpdateReset,
    store: createStore() as any,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    requestMock.post.mockResolvedValue(undefined);
  });

  test('renders heading', () => {
    render(<FactoryResetModal {...baseProps()} />);
    expect(screen.getByText('system.factory_reset.modal_title')).toBeDefined();
  });

  test('renders confirmation prompt', () => {
    render(<FactoryResetModal {...baseProps()} />);
    expect(screen.getByText('system.factory_reset.confirm_prompt')).toBeDefined();
  });

  test('UpdateReset mode shows upload button', () => {
    render(<FactoryResetModal {...baseProps()} />);
    expect(screen.getByTestId('upload-btn')).toBeDefined();
    expect(screen.getByText('system.buttons.select_and_reset')).toBeDefined();
  });

  test('FactoryReset mode shows reset button', () => {
    const props = baseProps();
    props.mode = ModalMode.FactoryReset;
    render(<FactoryResetModal {...props} />);
    expect(screen.getByTestId('btn')).toBeDefined();
    expect(screen.getByText('system.buttons.reset')).toBeDefined();
  });

  test('upload button disabled when confirmation text is wrong', () => {
    render(<FactoryResetModal {...baseProps()} />);
    expect(
      (screen.getByTestId('upload-btn') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  test('upload button enabled when text is factoryreset', () => {
    render(<FactoryResetModal {...baseProps()} />);
    fireEvent.change(screen.getByTestId('confirm-input'), {
      target: { value: 'factoryreset' },
    });
    expect(
      (screen.getByTestId('upload-btn') as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  test('reset button disabled when confirmation text is wrong', () => {
    const props = baseProps();
    props.mode = ModalMode.FactoryReset;
    render(<FactoryResetModal {...props} />);
    expect(
      (screen.getByTestId('btn') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  test('reset button enabled when text is factoryreset', () => {
    const props = baseProps();
    props.mode = ModalMode.FactoryReset;
    render(<FactoryResetModal {...props} />);
    fireEvent.change(screen.getByTestId('confirm-input'), {
      target: { value: 'factoryreset' },
    });
    expect(
      (screen.getByTestId('btn') as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  test('FactoryReset submit calls request.post', async () => {
    const props = baseProps();
    props.mode = ModalMode.FactoryReset;
    render(<FactoryResetModal {...props} />);
    fireEvent.change(screen.getByTestId('confirm-input'), {
      target: { value: 'factoryreset' },
    });
    fireEvent.click(screen.getByTestId('btn'));
    await waitFor(() => {
      expect(requestMock.post).toHaveBeenCalledWith(
        '/fwupdate/factoryreset',
        { factory_reset: true },
        expect.any(Object),
      );
    });
  });

  test('FactoryReset submit calls store.onUploadStart and onCancel', () => {
    const props = baseProps();
    props.mode = ModalMode.FactoryReset;
    render(<FactoryResetModal {...props} />);
    fireEvent.change(screen.getByTestId('confirm-input'), {
      target: { value: 'factoryreset' },
    });
    fireEvent.click(screen.getByTestId('btn'));
    expect(props.store.onUploadStart).toHaveBeenCalled();
    expect(props.onCancel).toHaveBeenCalled();
  });

  test('FactoryReset submit calls onUploadFinish on success', async () => {
    const props = baseProps();
    props.mode = ModalMode.FactoryReset;
    render(<FactoryResetModal {...props} />);
    fireEvent.change(screen.getByTestId('confirm-input'), {
      target: { value: 'factoryreset' },
    });
    fireEvent.click(screen.getByTestId('btn'));
    await waitFor(() => {
      expect(props.store.onUploadFinish).toHaveBeenCalled();
    });
  });

  test('FactoryReset submit calls onUploadError on failure', async () => {
    requestMock.post.mockRejectedValue(new Error('network'));
    const props = baseProps();
    props.mode = ModalMode.FactoryReset;
    render(<FactoryResetModal {...props} />);
    fireEvent.change(screen.getByTestId('confirm-input'), {
      target: { value: 'factoryreset' },
    });
    fireEvent.click(screen.getByTestId('btn'));
    await waitFor(() => {
      expect(props.store.onUploadError).toHaveBeenCalled();
    });
  });

  test('does not render when not opened', () => {
    const props = baseProps();
    props.isOpened = false;
    render(<FactoryResetModal {...props} />);
    expect(screen.queryByTestId('dialog')).toBeNull();
  });
});
