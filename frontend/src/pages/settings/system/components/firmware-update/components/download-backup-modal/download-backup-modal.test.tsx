// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { DownloadBackupModal } from './download-backup-modal';

vi.mock('react-i18next', () => {
  const t = (key: string) => key;
  return {
    useTranslation: () => ({ t, i18n: { language: 'en', changeLanguage: vi.fn(), t } }),
    Trans: ({ i18nKey, children }: any) => i18nKey || children,
  };
});
vi.mock('@/components/button', () => ({
  Button: ({ label, onClick }: any) => (
    <button onClick={onClick}>{label}</button>
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
vi.mock('../upload-button', () => ({
  UploadButton: ({ label, onClick }: any) => (
    <button data-testid="upload-btn" onClick={onClick}>{label}</button>
  ),
}));

describe('DownloadBackupModal', () => {
  const defaultProps = { isOpened: true, onCancel: vi.fn() };

  beforeEach(() => vi.clearAllMocks());

  test('renders heading', () => {
    render(<DownloadBackupModal {...defaultProps} />);
    expect(screen.getByText('system.update.backup_modal_title')).toBeDefined();
  });

  test('shows first page content', () => {
    render(<DownloadBackupModal {...defaultProps} />);
    expect(screen.getByText('system.update.backup_first_page')).toBeDefined();
  });

  test('first page has download backup button', () => {
    render(<DownloadBackupModal {...defaultProps} />);
    expect(screen.getByText('system.buttons.download_backup')).toBeDefined();
  });

  test('first page has select_anyway upload button', () => {
    render(<DownloadBackupModal {...defaultProps} />);
    expect(screen.getByText('system.buttons.select_anyway')).toBeDefined();
  });

  test('clicking download navigates to second page', () => {
    render(<DownloadBackupModal {...defaultProps} />);
    fireEvent.click(screen.getByText('system.buttons.download_backup'));
    expect(screen.getByText('system.update.backup_second_page')).toBeDefined();
    expect(screen.queryByText('system.update.backup_first_page')).toBeNull();
  });

  test('second page has select upload button', () => {
    render(<DownloadBackupModal {...defaultProps} />);
    fireEvent.click(screen.getByText('system.buttons.download_backup'));
    expect(screen.getByText('system.buttons.select')).toBeDefined();
  });

  test('does not render when not opened', () => {
    render(<DownloadBackupModal isOpened={false} onCancel={vi.fn()} />);
    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  test('close calls onCancel', () => {
    render(<DownloadBackupModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('dialog-close'));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  test('select_anyway calls onCancel', () => {
    render(<DownloadBackupModal {...defaultProps} />);
    fireEvent.click(screen.getByText('system.buttons.select_anyway'));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });
});
