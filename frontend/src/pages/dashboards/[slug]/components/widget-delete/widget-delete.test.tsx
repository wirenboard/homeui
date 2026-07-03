// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { WidgetDelete } from './widget-delete';

describe('WidgetDelete', () => {
  test('renders nothing when not opened', () => {
    render(
      <WidgetDelete
        name="Widget"
        associatedDashboards={[]}
        isOpened={false}
        onClose={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByText('widget.labels.delete')).toBeNull();
  });

  test('renders confirmation with widget name', () => {
    render(
      <WidgetDelete
        name="My Widget"
        associatedDashboards={[]}
        isOpened={true}
        onClose={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('My Widget')).toBeDefined();
    expect(screen.getByText('widget.labels.delete')).toBeDefined();
  });

  test('shows associated dashboards warning', () => {
    render(
      <WidgetDelete
        name="W"
        associatedDashboards={[
          { id: 'd1', name: 'Dashboard 1' } as any,
          { id: 'd2', name: 'Dashboard 2' } as any,
        ]}
        isOpened={true}
        onClose={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('Dashboard 1')).toBeDefined();
    expect(screen.getByText('Dashboard 2')).toBeDefined();
    expect(screen.getByText('widget.labels.warning')).toBeDefined();
  });

  test('hides warning when no associated dashboards', () => {
    render(
      <WidgetDelete
        name="W"
        associatedDashboards={[]}
        isOpened={true}
        onClose={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByText('widget.labels.warning')).toBeNull();
  });

  test('calls onDelete on confirm', () => {
    const onDelete = vi.fn();
    render(
      <WidgetDelete
        name="W"
        associatedDashboards={[]}
        isOpened={true}
        onClose={vi.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByText('modal.labels.yes'));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  test('calls onClose on cancel', () => {
    const onClose = vi.fn();
    render(
      <WidgetDelete
        name="W"
        associatedDashboards={[]}
        isOpened={true}
        onClose={onClose}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('modal.labels.cancel'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
