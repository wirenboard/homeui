// @vitest-environment happy-dom
import { render, fireEvent } from '@testing-library/react';
import { SvgView } from './svg-view';

describe('SvgView (edit)', () => {
  const svgContent = '<svg><rect id="box" /><text id="label"><tspan>Text</tspan></text><circle id="dot" /></svg>';

  test('renders svg content', () => {
    const { container } = render(<SvgView svg={svgContent} onSelectElement={vi.fn()} />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelector('#box')).toBeTruthy();
  });

  test('has svgView class', () => {
    const { container } = render(<SvgView svg={svgContent} onSelectElement={vi.fn()} />);
    expect(container.querySelector('.svgView')).toBeTruthy();
  });

  test('calls onSelectElement on click', () => {
    document.elementsFromPoint = vi.fn(() => []);
    const onSelect = vi.fn();
    const { container } = render(<SvgView svg={svgContent} onSelectElement={onSelect} />);
    fireEvent.click(container.querySelector('.svgView')!);
    expect(onSelect).toHaveBeenCalled();
  });

  test('updates svg when prop changes', () => {
    const { container, rerender } = render(<SvgView svg={svgContent} onSelectElement={vi.fn()} />);
    expect(container.querySelector('#box')).toBeTruthy();

    rerender(<SvgView svg='<svg><ellipse id="oval" /></svg>' onSelectElement={vi.fn()} />);
    expect(container.querySelector('#box')).toBeNull();
    expect(container.querySelector('#oval')).toBeTruthy();
  });
});
