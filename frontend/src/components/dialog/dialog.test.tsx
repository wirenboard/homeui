// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog } from './dialog';

describe('Dialog', () => {
  test('renders nothing when not opened', () => {
    render(<Dialog isOpened={false} heading="Title">body</Dialog>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('renders dialog when opened', () => {
    render(<Dialog isOpened={true} heading="Title">body content</Dialog>);
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('body content')).toBeDefined();
  });

  test('renders heading', () => {
    render(<Dialog isOpened={true} heading="My Dialog">x</Dialog>);
    expect(screen.getByText('My Dialog')).toBeDefined();
  });

  test('renders close button by default', () => {
    render(<Dialog isOpened={true} heading="H">x</Dialog>);
    expect(screen.getByLabelText('common.buttons.close')).toBeDefined();
  });

  test('hides close button when showCloseButton=false', () => {
    render(<Dialog isOpened={true} heading="H" showCloseButton={false}>x</Dialog>);
    expect(screen.queryByLabelText('common.buttons.close')).toBeNull();
  });

  test('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<Dialog isOpened={true} heading="H" onClose={onClose}>x</Dialog>);
    fireEvent.click(screen.getByLabelText('common.buttons.close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('applies custom className', () => {
    render(<Dialog isOpened={true} heading="H" className="my-dialog">x</Dialog>);
    expect(document.querySelector('.my-dialog')).toBeTruthy();
  });

  test('applies maxWidth from width prop', () => {
    render(<Dialog isOpened={true} heading="H" width={800}>x</Dialog>);
    const dialog = screen.getByRole('dialog');
    expect(dialog.style.maxWidth).toBe('800px');
  });

  test('renders headerActions', () => {
    render(
      <Dialog isOpened={true} heading="H" headerActions={<button>Extra</button>}>x</Dialog>,
    );
    expect(screen.getByText('Extra')).toBeDefined();
  });

  test('applies content padding by default', () => {
    render(<Dialog isOpened={true} heading="H">x</Dialog>);
    expect(document.querySelector('.dialog-content')).toBeTruthy();
  });

  test('removes content padding when withPadding=false', () => {
    render(<Dialog isOpened={true} heading="H" withPadding={false}>x</Dialog>);
    expect(document.querySelector('.dialog-content')).toBeNull();
  });
});
