// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Radio } from './radio';
import { RadioGroup } from './radio-group';

describe('Radio', () => {
  test('renders label', () => {
    render(<Radio id="test" label="Option A" checked={false} onChange={vi.fn()} />);
    expect(screen.getByText('Option A')).toBeDefined();
  });

  test('renders checked state', () => {
    render(<Radio id="test" label="A" checked={true} onChange={vi.fn()} />);
    expect((screen.getByRole('radio') as HTMLInputElement).checked).toBe(true);
  });

  test('calls onChange on click', () => {
    const onChange = vi.fn();
    render(<Radio id="test" label="A" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test('disables radio', () => {
    render(<Radio id="test" label="A" checked={false} isDisabled onChange={vi.fn()} />);
    expect((screen.getByRole('radio') as HTMLInputElement).disabled).toBe(true);
  });

  test('renders description', () => {
    render(<Radio id="test" label="A" description="More info" checked={false} onChange={vi.fn()} />);
    expect(screen.getByText('More info')).toBeDefined();
  });

  test('sets aria-label', () => {
    render(<Radio id="test" label="A" ariaLabel="choose a" checked={false} onChange={vi.fn()} />);
    expect(screen.getByRole('radio').getAttribute('aria-label')).toBe('choose a');
  });
});

describe('RadioGroup', () => {
  const opts = [
    { id: 'a', value: 'a', label: 'Alpha' },
    { id: 'b', value: 'b', label: 'Beta' },
    { id: 'c', value: 'c', label: 'Gamma' },
  ];

  test('renders all options', () => {
    render(<RadioGroup options={opts} value="a" onChange={vi.fn()} />);
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  test('checks the matching option', () => {
    render(<RadioGroup options={opts} value="b" onChange={vi.fn()} />);
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios[0].checked).toBe(false);
    expect(radios[1].checked).toBe(true);
  });

  test('calls onChange with option value', () => {
    const onChange = vi.fn();
    render(<RadioGroup options={opts} value="a" onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('radio')[2]);
    expect(onChange).toHaveBeenCalledWith('c');
  });

  test('disables all when isDisabled', () => {
    render(<RadioGroup options={opts} value="a" isDisabled onChange={vi.fn()} />);
    screen.getAllByRole('radio').forEach((r) => {
      expect((r as HTMLInputElement).disabled).toBe(true);
    });
  });

  test('applies layout class', () => {
    const { container } = render(<RadioGroup options={opts} value="a" layout="horizontal" onChange={vi.fn()} />);
    expect(container.querySelector('.radioGroup-horizontal')).toBeTruthy();
  });
});
