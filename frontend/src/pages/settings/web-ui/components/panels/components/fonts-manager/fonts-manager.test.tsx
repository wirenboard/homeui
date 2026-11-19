// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { cloneElement } from 'react';
import { FontsManager } from './fonts-manager';

const { fontsStoreMock } = vi.hoisted(() => ({
  fontsStoreMock: {
    fonts: [] as any[],
    isLoading: false,
    loadFonts: vi.fn(async () => {}),
    deleteFont: vi.fn(async () => {}),
  },
}));

vi.mock('@/stores/fonts', () => ({ fontsStore: fontsStoreMock }));

vi.mock('@rpldy/uploady', () => ({
  default: ({ children }: any) => <div data-testid="uploady">{children}</div>,
  useUploady: () => ({ showFileUpload: vi.fn() }),
  useItemFinishListener: vi.fn(),
  useItemErrorListener: vi.fn(),
}));

vi.mock('react-i18next', () => {
  const t = (key: string) => key;
  return {
    useTranslation: () => ({ t, i18n: { language: 'en', changeLanguage: vi.fn(), t } }),
    Trans: ({ i18nKey, values, components }: any) => (
      <span data-testid="trans" data-i18n-key={i18nKey}>
        {components?.[0]
          ? cloneElement(components[0], undefined, values?.name)
          : values?.name}
      </span>
    ),
  };
});

vi.mock('@/utils/async-action', () => ({
  useAsyncAction: (fn: any) => [fn, false],
}));

vi.mock('@/components/confirm', () => ({
  Confirm: ({
    isOpened, heading, confirmCallback, closeCallback, children,
  }: any) => isOpened ? (
    <div data-testid="confirm-dialog">
      <div data-testid="confirm-heading">{heading}</div>
      <div data-testid="confirm-body">{children}</div>
      <button data-testid="confirm-ok" onClick={confirmCallback}>ok</button>
      <button data-testid="confirm-cancel" onClick={closeCallback}>cancel</button>
    </div>
  ) : null,
}));

vi.mock('@/assets/icons/trash.svg', () => ({ default: () => null }));

vi.mock('@/components/alert', () => ({
  Alert: ({ variant, children, onClose }: any) => (
    <div data-testid="alert" data-variant={variant}>
      {children}
      {onClose && <button data-testid="alert-close" onClick={onClose} />}
    </div>
  ),
}));

vi.mock('@/components/button', () => ({
  Button: ({ label, onClick, icon, disabled, isLoading, 'aria-label': ariaLabel }: any) => (
    <button aria-label={ariaLabel} disabled={disabled} data-loading={isLoading} onClick={onClick}>
      {icon}
      {label}
    </button>
  ),
}));

vi.mock('@/components/loader', () => ({
  Loader: () => <div data-testid="loader" />,
}));

function getFontRow(name: string) {
  return screen.getByText(name).closest('li')!;
}

function getDeleteButton(name: string) {
  return within(getFontRow(name)).getByRole('button');
}

beforeEach(() => {
  vi.clearAllMocks();
  fontsStoreMock.fonts = [];
  fontsStoreMock.isLoading = false;
});

describe('FontsManager', () => {
  test('loads fonts on mount', () => {
    render(<FontsManager />);
    expect(fontsStoreMock.loadFonts).toHaveBeenCalled();
  });

  test('shows loader while loading with no fonts yet', () => {
    fontsStoreMock.isLoading = true;
    render(<FontsManager />);
    expect(screen.getByTestId('loader')).toBeDefined();
  });

  test('shows empty message when no fonts', () => {
    render(<FontsManager />);
    expect(screen.getByText('web-ui-settings.labels.no-fonts')).toBeDefined();
  });

  test('renders font list with name and size', () => {
    fontsStoreMock.fonts = [{ name: 'Roboto.ttf', size: 2048 }];
    render(<FontsManager />);
    expect(screen.getByText('Roboto.ttf')).toBeDefined();
    expect(screen.getByText('2.0 KB')).toBeDefined();
  });

  describe('delete font', () => {
    beforeEach(() => {
      fontsStoreMock.fonts = [
        { name: 'Roboto.ttf', size: 2048 },
        { name: 'OpenSans.woff2', size: 4096 },
      ];
    });

    test('clicking delete does not remove font immediately', () => {
      render(<FontsManager />);
      fireEvent.click(getDeleteButton('Roboto.ttf'));
      expect(fontsStoreMock.deleteFont).not.toHaveBeenCalled();
    });

    test('clicking delete opens confirmation dialog', () => {
      render(<FontsManager />);
      fireEvent.click(getDeleteButton('Roboto.ttf'));
      expect(screen.getByTestId('confirm-dialog')).toBeDefined();
      expect(screen.getByTestId('confirm-heading').textContent)
        .toBe('web-ui-settings.labels.confirm-delete-font-heading');
    });

    test('confirmation body highlights the font name in bold instead of quoting it', () => {
      render(<FontsManager />);
      fireEvent.click(getDeleteButton('Roboto.ttf'));
      const body = screen.getByTestId('confirm-body');
      expect(body.textContent).not.toContain('"Roboto.ttf"');
      const bold = within(body).getByText('Roboto.ttf');
      expect(bold.tagName).toBe('B');
    });

    test('confirming deletion calls deleteFont with the selected font name', async () => {
      render(<FontsManager />);
      fireEvent.click(getDeleteButton('Roboto.ttf'));
      fireEvent.click(screen.getByTestId('confirm-ok'));
      await waitFor(() => {
        expect(fontsStoreMock.deleteFont).toHaveBeenCalledWith('Roboto.ttf');
      });
    });

    test('cancelling the dialog closes it without deleting', () => {
      render(<FontsManager />);
      fireEvent.click(getDeleteButton('Roboto.ttf'));
      fireEvent.click(screen.getByTestId('confirm-cancel'));
      expect(screen.queryByTestId('confirm-dialog')).toBeNull();
      expect(fontsStoreMock.deleteFont).not.toHaveBeenCalled();
    });

    test('deleting one font does not affect a different font selection', async () => {
      render(<FontsManager />);
      fireEvent.click(getDeleteButton('OpenSans.woff2'));
      fireEvent.click(screen.getByTestId('confirm-ok'));
      await waitFor(() => {
        expect(fontsStoreMock.deleteFont).toHaveBeenCalledWith('OpenSans.woff2');
      });
      expect(fontsStoreMock.deleteFont).not.toHaveBeenCalledWith('Roboto.ttf');
    });
  });

  test('upload button triggers file picker', () => {
    render(<FontsManager />);
    fireEvent.click(screen.getByText('web-ui-settings.labels.upload-font'));
    expect(screen.getByTestId('uploady')).toBeDefined();
  });
});
