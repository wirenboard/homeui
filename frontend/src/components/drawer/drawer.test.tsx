// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Drawer } from './drawer';

describe('Drawer', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  test('renders nothing when not opened', () => {
    render(<Drawer isOpened={false} heading="Title">body</Drawer>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('renders dialog when opened', () => {
    render(<Drawer isOpened={true} heading="Title">body content</Drawer>);
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('body content')).toBeDefined();
  });

  test('renders heading', () => {
    render(<Drawer isOpened={true} heading="My Drawer">x</Drawer>);
    expect(screen.getByText('My Drawer')).toBeDefined();
  });

  test('applies custom className', () => {
    render(<Drawer isOpened={true} heading="H" className="my-drawer">x</Drawer>);
    expect(document.querySelector('.my-drawer')).toBeTruthy();
  });

  test('applies width from number prop', () => {
    render(<Drawer isOpened={true} heading="H" width={800}>x</Drawer>);
    const dialog = screen.getByRole('dialog');
    expect(dialog.style.width).toBe('800px');
  });

  test('renders close button by default', () => {
    render(<Drawer isOpened={true} heading="H">x</Drawer>);
    expect(screen.getByLabelText('common.buttons.close')).toBeDefined();
  });

  test('hides close button when showCloseButton=false', () => {
    render(<Drawer isOpened={true} heading="H" showCloseButton={false}>x</Drawer>);
    expect(screen.queryByLabelText('common.buttons.close')).toBeNull();
  });

  test('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<Drawer isOpened={true} heading="H" onClose={onClose}>x</Drawer>);
    fireEvent.click(screen.getByLabelText('common.buttons.close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('renders headerActions', () => {
    render(
      <Drawer isOpened={true} heading="H" headerActions={<button>Extra</button>}>x</Drawer>,
    );
    expect(screen.getByText('Extra')).toBeDefined();
  });

  test('renders footerActions', () => {
    render(
      <Drawer isOpened={true} heading="H" footerActions={<button>Save</button>}>x</Drawer>,
    );
    expect(screen.getByText('Save')).toBeDefined();
  });

  test('does not render footer when no footerActions', () => {
    render(<Drawer isOpened={true} heading="H">x</Drawer>);
    expect(document.querySelector('.drawer-footer')).toBeNull();
  });

  test('calls onClose on overlay click', () => {
    const onClose = vi.fn();
    render(<Drawer isOpened={true} heading="H" onClose={onClose}>x</Drawer>);
    fireEvent.click(document.querySelector('.drawer-overlay')!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('does not close on overlay click when isOverlayCloseDisabled', () => {
    const onClose = vi.fn();
    render(<Drawer isOpened={true} heading="H" isOverlayCloseDisabled onClose={onClose}>x</Drawer>);
    fireEvent.click(document.querySelector('.drawer-overlay')!);
    expect(onClose).not.toHaveBeenCalled();
  });

  test('does not close on click inside drawer panel', () => {
    const onClose = vi.fn();
    render(<Drawer isOpened={true} heading="H" onClose={onClose}>x</Drawer>);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  test('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(<Drawer isOpened={true} heading="H" onClose={onClose}>x</Drawer>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('Escape closes only topmost drawer', () => {
    const onCloseBottom = vi.fn();
    const onCloseTop = vi.fn();
    render(
      <>
        <Drawer isOpened={true} heading="Bottom" onClose={onCloseBottom}>bottom</Drawer>
        <Drawer isOpened={true} heading="Top" onClose={onCloseTop}>top</Drawer>
      </>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCloseTop).toHaveBeenCalledOnce();
    expect(onCloseBottom).not.toHaveBeenCalled();
  });

  test('locks body scroll when opened', () => {
    const { unmount } = render(<Drawer isOpened={true} heading="H">x</Drawer>);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  describe('isDirty confirmation', () => {
    test('shows Confirm dialog instead of closing when dirty', () => {
      const onClose = vi.fn();
      render(<Drawer isOpened={true} heading="H" isDirty onClose={onClose}>x</Drawer>);
      fireEvent.click(screen.getByLabelText('common.buttons.close'));
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText('drawer.labels.unsaved-changes')).toBeDefined();
    });

    test('cancelling confirmation keeps drawer open', () => {
      const onClose = vi.fn();
      render(<Drawer isOpened={true} heading="H" isDirty onClose={onClose}>x</Drawer>);
      fireEvent.click(screen.getByLabelText('common.buttons.close'));
      fireEvent.click(screen.getByText('modal.labels.cancel'));
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.queryByText('drawer.labels.unsaved-changes')).toBeNull();
    });

    test('accepting confirmation closes drawer', () => {
      const onClose = vi.fn();
      render(<Drawer isOpened={true} heading="H" isDirty onClose={onClose}>x</Drawer>);
      fireEvent.click(screen.getByLabelText('common.buttons.close'));
      fireEvent.click(screen.getByText('drawer.labels.discard'));
      expect(onClose).toHaveBeenCalledOnce();
    });

    test('Escape when dirty shows confirmation', () => {
      const onClose = vi.fn();
      render(<Drawer isOpened={true} heading="H" isDirty onClose={onClose}>x</Drawer>);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText('drawer.labels.unsaved-changes')).toBeDefined();
    });

    test('overlay click when dirty shows confirmation', () => {
      const onClose = vi.fn();
      render(<Drawer isOpened={true} heading="H" isDirty onClose={onClose}>x</Drawer>);
      fireEvent.click(document.querySelector('.drawer-overlay')!);
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText('drawer.labels.unsaved-changes')).toBeDefined();
    });

    test('does not show confirmation when not dirty', () => {
      const onClose = vi.fn();
      render(<Drawer isOpened={true} heading="H" isDirty={false} onClose={onClose}>x</Drawer>);
      fireEvent.click(screen.getByLabelText('common.buttons.close'));
      expect(onClose).toHaveBeenCalledOnce();
      expect(screen.queryByText('drawer.labels.unsaved-changes')).toBeNull();
    });
  });
});
