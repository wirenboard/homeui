// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './input';

describe('Input', () => {
  test('renders with value', () => {
    render(<Input value="hello" onChange={vi.fn()} />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('hello');
  });

  test('calls onChange on blur when value changed', () => {
    const onChange = vi.fn();
    render(<Input value="old" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith('new');
  });

  test('calls onChange on Enter key', () => {
    const onChange = vi.fn();
    render(<Input value="old" isWithExplicitChanges onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('new');
  });

  test('reverts on Escape key', () => {
    render(<Input value="original" isWithExplicitChanges onChange={vi.fn()} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'changed' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('original');
  });

  test('disables input', () => {
    render(<Input value="" isDisabled onChange={vi.fn()} />);
    expect((screen.getByRole('textbox') as HTMLInputElement).disabled).toBe(true);
  });

  test('applies size class', () => {
    const { container } = render(<Input value="" size="small" onChange={vi.fn()} />);
    expect(container.querySelector('.input-s')).toBeTruthy();
  });

  test('applies invalid class', () => {
    const { container } = render(<Input value="" isInvalid onChange={vi.fn()} />);
    expect(container.querySelector('.input-invalid')).toBeTruthy();
  });

  test('applies fullWidth class', () => {
    const { container } = render(<Input value="" isFullWidth onChange={vi.fn()} />);
    expect(container.querySelector('.input-fullWidth')).toBeTruthy();
  });

  test('sets aria attributes', () => {
    render(
      <Input value="" ariaLabel="name" ariaDescribedby="desc" ariaInvalid={true} onChange={vi.fn()} />,
    );
    const input = screen.getByRole('textbox');
    expect(input.getAttribute('aria-label')).toBe('name');
    expect(input.getAttribute('aria-describedby')).toBe('desc');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  test('calls onEnter callback on Enter', () => {
    const onEnter = vi.fn();
    render(<Input value="x" onChange={vi.fn()} onEnter={onEnter} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onEnter).toHaveBeenCalledOnce();
  });
});
