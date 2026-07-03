// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardEdit } from './dashboard-edit';

vi.mock('@/utils/id', () => ({
  generateNextId: vi.fn(() => 'dashboard1'),
}));

const dashboards = [
  { id: 'dash1', name: 'First' },
  { id: 'dash2', name: 'Second' },
] as any[];

describe('DashboardEdit', () => {
  test('renders create heading when no dashboard', () => {
    render(
      <DashboardEdit
        dashboard={null as any}
        dashboards={dashboards}
        isOpened={true}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('dashboards.labels.create')).toBeDefined();
  });

  test('renders edit heading with dashboard name', () => {
    render(
      <DashboardEdit
        dashboard={{ id: 'dash1', name: 'First' } as any}
        dashboards={dashboards}
        isOpened={true}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('dashboards.labels.edit')).toBeDefined();
  });

  test('renders name and id inputs', () => {
    render(
      <DashboardEdit
        dashboard={{ id: 'dash1', name: 'Test' } as any}
        dashboards={dashboards}
        isOpened={true}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const inputs = document.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  test('shows duplicate error for non-unique id', () => {
    render(
      <DashboardEdit
        dashboard={null as any}
        dashboards={dashboards}
        isOpened={true}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const idInput = document.querySelectorAll('input')[1] as HTMLInputElement;
    fireEvent.change(idInput, { target: { value: 'dash2' } });
    fireEvent.blur(idInput);
    expect(screen.getByText('dashboards.errors.duplicate')).toBeDefined();
  });

  test('calls onClose when cancel clicked', () => {
    const onClose = vi.fn();
    render(
      <DashboardEdit
        dashboard={null as any}
        dashboards={dashboards}
        isOpened={true}
        onSave={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByText('modal.labels.cancel'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('calls onSave with name and id', () => {
    const onSave = vi.fn();
    render(
      <DashboardEdit
        dashboard={null as any}
        dashboards={dashboards}
        isOpened={true}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    const nameInput = document.querySelectorAll('input')[0] as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'New Dashboard' } });
    fireEvent.blur(nameInput);

    fireEvent.click(screen.getByText('dashboards.buttons.save'));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Dashboard' }),
      true,
    );
  });

  test('nothing rendered when isOpened=false', () => {
    render(
      <DashboardEdit
        dashboard={null as any}
        dashboards={dashboards}
        isOpened={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText('dashboards.labels.create')).toBeNull();
  });
});
