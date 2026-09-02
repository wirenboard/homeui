// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from './search-bar';

describe('SearchBar', () => {
  test('renders search input with type="search"', () => {
    render(<SearchBar value="" onChange={vi.fn()} />);
    expect(screen.getByRole('searchbox')).toBeTruthy();
  });

  test('shows search icon when value is empty', () => {
    const { container } = render(<SearchBar value="" onChange={vi.fn()} />);
    expect(container.querySelector('.search-bar-icon')).toBeTruthy();
  });

  test('hides search icon when value is present', () => {
    const { container } = render(<SearchBar value="test" onChange={vi.fn()} />);
    expect(container.querySelector('.search-bar-icon')).toBeNull();
  });

  test('is collapsed by default when empty and unfocused', () => {
    const { container } = render(<SearchBar value="" onChange={vi.fn()} />);
    expect(container.querySelector('.search-bar-expanded')).toBeNull();
  });

  test('expands on focus', () => {
    const { container } = render(<SearchBar value="" onChange={vi.fn()} />);
    fireEvent.focus(screen.getByRole('searchbox'));
    expect(container.querySelector('.search-bar-expanded')).toBeTruthy();
  });

  test('expands when value is present', () => {
    const { container } = render(<SearchBar value="query" onChange={vi.fn()} />);
    expect(container.querySelector('.search-bar-expanded')).toBeTruthy();
  });

  test('collapses on blur when value is empty', () => {
    const { container } = render(<SearchBar value="" onChange={vi.fn()} />);
    const input = screen.getByRole('searchbox');
    fireEvent.focus(input);
    expect(container.querySelector('.search-bar-expanded')).toBeTruthy();
    fireEvent.blur(input);
    expect(container.querySelector('.search-bar-expanded')).toBeNull();
  });

  test('calls onChange on typing', () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  test('clears value and blurs on Escape', () => {
    const onChange = vi.fn();
    render(<SearchBar value="query" onChange={onChange} />);
    const input = screen.getByRole('searchbox');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onChange).toHaveBeenCalledWith('');
  });

  test('shows placeholder only when expanded', () => {
    const { rerender } = render(
      <SearchBar value="" placeholder="Search devices" onChange={vi.fn()} />,
    );
    const input = screen.getByRole('searchbox') as HTMLInputElement;
    expect(input.placeholder).toBe('');
    fireEvent.focus(input);
    rerender(<SearchBar value="" placeholder="Search devices" onChange={vi.fn()} />);
    expect(input.placeholder).toBe('Search devices');
  });

  test('sets aria-label from ariaLabel prop', () => {
    render(<SearchBar value="" ariaLabel="Search" onChange={vi.fn()} />);
    expect(screen.getByRole('searchbox').getAttribute('aria-label')).toBe('Search');
  });

  test('falls back aria-label to placeholder', () => {
    render(<SearchBar value="" placeholder="Find" onChange={vi.fn()} />);
    expect(screen.getByRole('searchbox').getAttribute('aria-label')).toBe('Find');
  });

  test('adds has-value class when value is present', () => {
    const { container } = render(<SearchBar value="test" onChange={vi.fn()} />);
    expect(container.querySelector('.search-bar-input-has-value')).toBeTruthy();
  });
});
