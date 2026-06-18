// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Confirm } from './confirm';

describe('Confirm', () => {
  test('renders nothing when not opened', () => {
    render(
      <Confirm isOpened={false} heading="Sure?">body</Confirm>,
    );
    expect(screen.queryByText('body')).toBeNull();
  });

  test('renders dialog content when opened', () => {
    render(<Confirm isOpened={true} heading="Sure?">Are you sure?</Confirm>);
    expect(screen.getByText('Are you sure?')).toBeDefined();
  });

  test('renders heading', () => {
    render(<Confirm isOpened={true} heading="Confirm Delete">x</Confirm>);
    expect(screen.getByText('Confirm Delete')).toBeDefined();
  });

  test('renders default cancel and accept buttons', () => {
    render(<Confirm isOpened={true} heading="H">x</Confirm>);
    expect(screen.getByText('modal.labels.cancel')).toBeDefined();
    expect(screen.getByText('modal.labels.yes')).toBeDefined();
  });

  test('renders custom button labels', () => {
    render(<Confirm isOpened={true} heading="H" acceptLabel="OK" cancelLabel="Nope">x</Confirm>);
    expect(screen.getByText('OK')).toBeDefined();
    expect(screen.getByText('Nope')).toBeDefined();
  });

  test('calls confirmCallback on accept click', () => {
    const confirm = vi.fn();
    render(<Confirm isOpened={true} heading="H" confirmCallback={confirm}>x</Confirm>);
    fireEvent.click(screen.getByText('modal.labels.yes'));
    expect(confirm).toHaveBeenCalledOnce();
  });

  test('calls closeCallback on cancel click', () => {
    const close = vi.fn();
    render(<Confirm isOpened={true} heading="H" closeCallback={close}>x</Confirm>);
    fireEvent.click(screen.getByText('modal.labels.cancel'));
    expect(close).toHaveBeenCalledOnce();
  });

  test('disables accept button when isDisabled', () => {
    render(<Confirm isOpened={true} heading="H" isDisabled>x</Confirm>);
    const acceptBtn = screen.getByText('modal.labels.yes').closest('button');
    expect(acceptBtn!.disabled).toBe(true);
  });

  test('shows loading state on accept button', () => {
    render(<Confirm isOpened={true} heading="H" isLoading>x</Confirm>);
    const acceptBtn = screen.getByText('modal.labels.yes').closest('button');
    expect(acceptBtn!.getAttribute('aria-busy')).toBe('true');
  });

  test('disables cancel button when loading', () => {
    render(<Confirm isOpened={true} heading="H" isLoading>x</Confirm>);
    const cancelBtn = screen.getByText('modal.labels.cancel').closest('button');
    expect(cancelBtn!.disabled).toBe(true);
  });

  test('renders custom footerActions instead of default buttons', () => {
    render(
      <Confirm isOpened={true} heading="H" footerActions={<button>Custom</button>}>x</Confirm>,
    );
    expect(screen.getByText('Custom')).toBeDefined();
    expect(screen.queryByText('modal.labels.yes')).toBeNull();
  });

  test('prevents Enter submit when isPreventSubmit', () => {
    render(<Confirm isOpened={true} heading="H" isPreventSubmit>x</Confirm>);
    const form = document.querySelector('form')!;
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    const prevented = !form.dispatchEvent(event);
    expect(prevented).toBe(true);
  });
});
