// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { FormGroup } from './form-group';

describe('FormGroup', () => {
  test('renders children', () => {
    render(<FormGroup><input /><button>Go</button></FormGroup>);
    expect(screen.getByText('Go')).toBeDefined();
    expect(screen.getByRole('textbox')).toBeDefined();
  });

  test('has formFields-group class', () => {
    const { container } = render(<FormGroup>x</FormGroup>);
    expect(container.querySelector('.formFields-group')).toBeTruthy();
  });
});
