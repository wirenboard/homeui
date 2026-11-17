// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Textarea } from './textarea';

describe('Textarea', () => {
  test('renders with value', () => {
    render(<Textarea value="hello" onChange={vi.fn()} />);
    const el = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(el.value).toBe('hello');
  });

  test('calls onChange on blur when value changed', () => {
    const onChange = vi.fn();
    render(<Textarea value="old" onChange={onChange} />);
    const el = screen.getByRole('textbox');
    fireEvent.change(el, { target: { value: 'new' } });
    fireEvent.blur(el);
    expect(onChange).toHaveBeenCalledWith('new');
  });

  test('does not call onChange on blur when value unchanged', () => {
    const onChange = vi.fn();
    render(<Textarea value="same" onChange={onChange} />);
    fireEvent.blur(screen.getByRole('textbox'));
    expect(onChange).not.toHaveBeenCalled();
  });

  test('calls onChange on Enter key', () => {
    const onChange = vi.fn();
    render(<Textarea value="old" isWithExplicitChanges onChange={onChange} />);
    const el = screen.getByRole('textbox');
    fireEvent.change(el, { target: { value: 'new' } });
    fireEvent.keyDown(el, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('new');
  });

  test('reverts on Escape key', () => {
    render(<Textarea value="original" isWithExplicitChanges onChange={vi.fn()} />);
    const el = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(el, { target: { value: 'changed' } });
    fireEvent.keyDown(el, { key: 'Escape' });
    expect(el.value).toBe('original');
  });

  test('immediate onChange without explicit changes', () => {
    const onChange = vi.fn();
    render(<Textarea value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'typed' } });
    expect(onChange).toHaveBeenCalledWith('typed');
  });

  test('disables textarea', () => {
    render(<Textarea value="" isDisabled onChange={vi.fn()} />);
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).disabled).toBe(true);
  });

  test('applies size class', () => {
    const { container } = render(<Textarea value="" size="small" onChange={vi.fn()} />);
    expect(container.querySelector('.textarea-s')).toBeTruthy();
  });

  test('applies invalid class', () => {
    const { container } = render(<Textarea value="" isInvalid onChange={vi.fn()} />);
    expect(container.querySelector('.textarea-invalid')).toBeTruthy();
  });

  test('sets aria attributes', () => {
    render(
      <Textarea value="" ariaLabel="desc" ariaDescribedby="help" ariaInvalid={true} onChange={vi.fn()} />,
    );
    const el = screen.getByRole('textbox');
    expect(el.getAttribute('aria-label')).toBe('desc');
    expect(el.getAttribute('aria-describedby')).toBe('help');
    expect(el.getAttribute('aria-invalid')).toBe('true');
  });
});
