// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { Progress } from './progress';

describe('Progress', () => {
  test('renders progress bar with value', () => {
    render(<Progress value={75} caption="75%" />);
    const bar = document.querySelector('progress') as HTMLProgressElement;
    expect(bar.value).toBe(75);
    expect(bar.max).toBe(100);
  });

  test('renders caption', () => {
    render(<Progress value={50} caption="Half done" />);
    expect(screen.getByText('Half done')).toBeDefined();
  });
});
