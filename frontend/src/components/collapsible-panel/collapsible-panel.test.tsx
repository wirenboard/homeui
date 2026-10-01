// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { CollapsiblePanel } from './collapsible-panel';

describe('CollapsiblePanel', () => {
  test('renders title', () => {
    render(<CollapsiblePanel title="Settings">content</CollapsiblePanel>);
    expect(screen.getByText('Settings')).toBeDefined();
  });

  test('shows children by default', () => {
    render(<CollapsiblePanel title="T">Visible content</CollapsiblePanel>);
    expect(screen.getByText('Visible content')).toBeDefined();
  });

  test('hides children when isCollapsed=true', () => {
    render(<CollapsiblePanel title="T" isCollapsed={true}>Hidden</CollapsiblePanel>);
    expect(screen.queryByText('Hidden')).toBeNull();
  });

  test('toggles visibility on button click', () => {
    render(<CollapsiblePanel title="T">Toggle me</CollapsiblePanel>);
    expect(screen.getByText('Toggle me')).toBeDefined();

    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByText('Toggle me')).toBeNull();

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Toggle me')).toBeDefined();
  });

  test('button has aria-expanded attribute', () => {
    render(<CollapsiblePanel title="T">x</CollapsiblePanel>);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  test('button has aria-label for collapsed state', () => {
    render(<CollapsiblePanel title="T" isCollapsed>x</CollapsiblePanel>);
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('common.buttons.expand');
  });
});
