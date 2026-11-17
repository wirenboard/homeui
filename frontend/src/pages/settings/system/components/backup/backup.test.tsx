// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { Backup } from './backup';

vi.mock('@/components/card', () => ({
  Card: ({ heading, children }: any) => (
    <div><h2>{heading}</h2>{children}</div>
  ),
}));

describe('Backup', () => {
  test('renders heading', () => {
    render(<Backup className="" />);
    expect(screen.getByText('system.backup.title')).toBeDefined();
  });

  test('renders warning list items', () => {
    render(<Backup className="" />);
    expect(screen.getByText('system.backup.rootfs_warning1')).toBeDefined();
    expect(screen.getByText('system.backup.rootfs_warning2')).toBeDefined();
    expect(screen.getByText('system.backup.rootfs_warning3')).toBeDefined();
  });

  test('renders rootfs download link', () => {
    render(<Backup className="" />);
    const link = screen.getByText('system.backup.download_rootfs_button');
    expect(link.closest('a')?.getAttribute('href')).toBe('fwupdate/download/rootfs');
  });

  test('renders configs download link', () => {
    render(<Backup className="" />);
    const link = screen.getByText('system.backup.download_configs_button');
    expect(link.closest('a')?.getAttribute('href')).toBe('fwupdate/download/configs');
  });

  test('renders everything download link', () => {
    render(<Backup className="" />);
    const link = screen.getByText('system.backup.download_everything_button');
    expect(link.closest('a')?.getAttribute('href')).toBe('fwupdate/download/everything');
  });

  test('all download links have download attribute', () => {
    render(<Backup className="" />);
    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      expect(link.hasAttribute('download')).toBe(true);
    });
  });
});
