// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from './card';

vi.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
}));

describe('Card', () => {
  test('renders heading', () => {
    render(<Card heading="Title">body</Card>);
    expect(screen.getByText('Title')).toBeDefined();
  });

  test('renders children in body', () => {
    render(<Card heading="H">Content here</Card>);
    expect(screen.getByText('Content here')).toBeDefined();
  });

  test('has role="group"', () => {
    render(<Card heading="H">x</Card>);
    expect(screen.getByRole('group')).toBeDefined();
  });

  test('applies variant class', () => {
    const { container } = render(<Card heading="H" variant="secondary">x</Card>);
    expect(container.querySelector('.card-secondary')).toBeTruthy();
  });

  test('applies custom className', () => {
    const { container } = render(<Card heading="H" className="my-card">x</Card>);
    expect(container.querySelector('.my-card')).toBeTruthy();
  });

  test('hides body when isBodyVisible=false', () => {
    render(<Card heading="H" isBodyVisible={false} toggleBody={vi.fn()}>Hidden</Card>);
    expect(screen.queryByText('Hidden')).toBeNull();
  });

  test('shows body when isBodyVisible=true', () => {
    render(<Card heading="H" isBodyVisible={true} toggleBody={vi.fn()}>Visible</Card>);
    expect(screen.getByText('Visible')).toBeDefined();
  });

  test('toggleBody renders clickable header', () => {
    const toggle = vi.fn();
    render(<Card heading="Toggle Me" toggleBody={toggle} isBodyVisible={true}>x</Card>);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(btn);
    expect(toggle).toHaveBeenCalledOnce();
  });

  test('keyboard Enter triggers toggleBody', () => {
    const toggle = vi.fn();
    render(<Card heading="KB" toggleBody={toggle} isBodyVisible={true}>x</Card>);
    const btn = screen.getByRole('button');
    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(toggle).toHaveBeenCalledOnce();
  });

  test('keyboard Space triggers toggleBody', () => {
    const toggle = vi.fn();
    render(<Card heading="KB" toggleBody={toggle} isBodyVisible={true}>x</Card>);
    const btn = screen.getByRole('button');
    fireEvent.keyDown(btn, { key: ' ' });
    expect(toggle).toHaveBeenCalledOnce();
  });

  test('renders action buttons', () => {
    const action = {
      title: 'Delete',
      action: vi.fn(),
      icon: (props: any) => <svg {...props} data-testid="del-icon" />,
    };
    render(<Card heading="H" actions={[action]}>x</Card>);
    const btn = screen.getByLabelText('Delete');
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(action.action).toHaveBeenCalled();
  });

  test('renders disabled action button', () => {
    const action = {
      title: 'Disabled',
      action: vi.fn(),
      disabled: true,
      icon: (props: any) => <svg {...props} />,
    };
    render(<Card heading="H" actions={[action]}>x</Card>);
    const btn = screen.getByLabelText('Disabled');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  test('renders action as link when url provided', () => {
    const action = {
      title: 'Link',
      url: (id?: string) => `/items/${id}`,
      icon: (props: any) => <svg {...props} />,
    };
    render(<Card heading="H" id="42" actions={[action]}>x</Card>);
    const link = document.querySelector('a.card-action') as HTMLAnchorElement;
    expect(link.href).toContain('/items/42');
  });

  test('withError applies error class to title', () => {
    const { container } = render(<Card heading="Err" withError>x</Card>);
    expect(container.querySelector('.card-titleWithError')).toBeTruthy();
  });
});
