// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Dropdown } from './dropdown';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

describe('Dropdown', () => {
  test('renders selected value', () => {
    render(<Dropdown options={options} value="b" onChange={vi.fn()} />);
    expect(screen.getByText('Beta')).toBeDefined();
  });

  test('renders placeholder when no value matches', () => {
    render(<Dropdown options={options} value={null} placeholder="Choose..." onChange={vi.fn()} />);
    expect(screen.getByText('Choose...')).toBeDefined();
  });

  test('applies size class', () => {
    const { container } = render(
      <Dropdown options={options} value="a" size="small" onChange={vi.fn()} />,
    );
    expect(container.querySelector('.dropdown-s')).toBeTruthy();
  });

  test('applies invalid class', () => {
    const { container } = render(
      <Dropdown options={options} value="a" isInvalid onChange={vi.fn()} />,
    );
    expect(container.querySelector('.dropdown-invalid')).toBeTruthy();
  });

  test('applies button class when isButton', () => {
    const { container } = render(
      <Dropdown options={options} value="a" isButton onChange={vi.fn()} />,
    );
    expect(container.querySelector('.dropdown-button')).toBeTruthy();
  });

  test('renders with custom className', () => {
    const { container } = render(
      <Dropdown options={options} value="a" className="my-dd" onChange={vi.fn()} />,
    );
    expect(container.querySelector('.my-dd')).toBeTruthy();
  });

  test('sets aria-label', () => {
    render(<Dropdown options={options} value="a" ariaLabel="Pick one" onChange={vi.fn()} />);
    const input = document.querySelector('[aria-label="Pick one"]');
    expect(input).toBeTruthy();
  });

  test('renders with grouped options', () => {
    const grouped = [
      { label: 'Group 1', options: [{ value: 'g1', label: 'Item 1' }] },
    ];
    render(<Dropdown options={grouped} value="g1" onChange={vi.fn()} />);
    expect(screen.getByText('Item 1')).toBeDefined();
  });

  test('opens menu on click and calls onChange on option select', async () => {
    const onChange = vi.fn();
    render(<Dropdown options={options} value="a" onChange={onChange} />);

    const control = document.querySelector('.dropdown__control')!;
    fireEvent.mouseDown(control);

    const option = await screen.findByText('Gamma');
    fireEvent.click(option);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'c', label: 'Gamma' }),
    );
  });

  test('renders disabled state', () => {
    const { container } = render(
      <Dropdown options={options} value="a" isDisabled onChange={vi.fn()} />,
    );
    expect(container.querySelector('.dropdown__control--is-disabled')).toBeTruthy();
  });

  test('renders loading state', () => {
    const { container } = render(
      <Dropdown options={options} value="a" isLoading onChange={vi.fn()} />,
    );
    expect(container.querySelector('.dropdown__loading-indicator')).toBeTruthy();
  });

  test('renders searchable dropdown', () => {
    const { container } = render(<Dropdown options={options} value="a" isSearchable onChange={vi.fn()} />);
    const input = container.querySelector('input');
    expect(input).toBeTruthy();
    expect(input!.getAttribute('aria-autocomplete')).toBe('list');
  });

  test('renders clearable dropdown', () => {
    const { container } = render(
      <Dropdown options={options} value="a" isClearable onChange={vi.fn()} />,
    );
    expect(container.querySelector('.dropdown__clear-indicator')).toBeTruthy();
  });

  test('custom noOptionsMessage renders', async () => {
    render(
      <Dropdown
        options={[]}
        value={null}
        noOptionsMessage="Nothing here"
        isSearchable
        onChange={vi.fn()}
      />,
    );
    const control = document.querySelector('.dropdown__control')!;
    fireEvent.mouseDown(control);
    expect(await screen.findByText('Nothing here')).toBeDefined();
  });

  test('uses placeholder as aria-label fallback', () => {
    render(<Dropdown options={options} value="a" placeholder="Select..." onChange={vi.fn()} />);
    const input = document.querySelector('[aria-label="Select..."]');
    expect(input).toBeTruthy();
  });

  test('hidden option is not displayed', async () => {
    const opts = [
      { value: 'visible', label: 'Visible' },
      { value: 'hidden', label: 'Hidden', hidden: true },
    ];
    render(<Dropdown options={opts} value={null} onChange={vi.fn()} />);
    const control = document.querySelector('.dropdown__control')!;
    fireEvent.mouseDown(control);

    expect(await screen.findByText('Visible')).toBeDefined();
    const hiddenEl = screen.getByText('Hidden');
    expect((hiddenEl.closest('[style]') as HTMLElement)?.style?.display
      || getComputedStyle(hiddenEl.closest('.dropdown__option')!).display).toBe('none');
  });

  test('multiselect displays selected values from array', () => {
    render(
      <Dropdown options={options} value={['a', 'c']} multiselect onChange={vi.fn()} />,
    );
    expect(screen.getByText('Alpha')).toBeDefined();
    expect(screen.getByText('Gamma')).toBeDefined();
  });

  test('multiselect shows placeholder when value is null', () => {
    render(
      <Dropdown options={options} value={null} placeholder="Pick..." multiselect onChange={vi.fn()} />,
    );
    expect(screen.getByText('Pick...')).toBeDefined();
  });

  test('multiselect displays values from grouped options', () => {
    const grouped = [
      { label: 'Group 1', options: [{ value: 'g1', label: 'Item 1' }] },
      { label: 'Group 2', options: [{ value: 'g2', label: 'Item 2' }] },
    ];
    render(
      <Dropdown options={grouped} value={['g1', 'g2']} multiselect onChange={vi.fn()} />,
    );
    expect(screen.getByText('Item 1')).toBeDefined();
    expect(screen.getByText('Item 2')).toBeDefined();
  });
});
