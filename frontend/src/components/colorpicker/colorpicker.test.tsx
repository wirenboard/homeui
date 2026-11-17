// @vitest-environment happy-dom
import { render, fireEvent } from '@testing-library/react';
import { Colorpicker } from './colorpicker';

describe('Colorpicker', () => {
  test('renders color input with value', () => {
    const { container } = render(<Colorpicker id="test" value="#ff0000" onChange={vi.fn()} />);
    const input = container.querySelector('input[type="color"]') as HTMLInputElement;
    expect(input.value).toBe('#ff0000');
  });

  test('defaults to black when no value', () => {
    const { container } = render(<Colorpicker id="test" value="" onChange={vi.fn()} />);
    const input = container.querySelector('input[type="color"]') as HTMLInputElement;
    expect(input.value).toBe('#000000');
  });

  test('calls onChange on color change', () => {
    const onChange = vi.fn();
    const { container } = render(<Colorpicker id="test" value="#000000" onChange={onChange} />);
    fireEvent.change(container.querySelector('input')!, { target: { value: '#00ff00' } });
    expect(onChange).toHaveBeenCalledWith('#00ff00');
  });

  test('disables input', () => {
    const { container } = render(<Colorpicker id="test" value="#000" isDisabled onChange={vi.fn()} />);
    expect((container.querySelector('input') as HTMLInputElement).disabled).toBe(true);
  });

  test('applies invalid class', () => {
    const { container } = render(<Colorpicker id="test" value="#000" isInvalid onChange={vi.fn()} />);
    expect(container.querySelector('.colorpicker-invalid')).toBeTruthy();
  });

  test('sets aria-label', () => {
    const { container } = render(<Colorpicker id="test" value="#000" ariaLabel="pick" onChange={vi.fn()} />);
    expect(container.querySelector('input')!.getAttribute('aria-label')).toBe('pick');
  });
});
