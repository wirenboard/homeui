// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { FormFieldGroup } from './field-group';
import { OptionsField } from './options-field';
import { PasswordField } from './password-field';

vi.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
}));

describe('FormFieldGroup', () => {
  test('renders heading in card', () => {
    render(<FormFieldGroup heading="Settings">content</FormFieldGroup>);
    expect(screen.getByText('Settings')).toBeDefined();
    expect(screen.getByText('content')).toBeDefined();
  });

  test('has form-fieldGroup class', () => {
    const { container } = render(<FormFieldGroup heading="H">x</FormFieldGroup>);
    expect(container.querySelector('.form-fieldGroup')).toBeTruthy();
  });
});

describe('PasswordField', () => {
  test('renders label and password input', () => {
    render(<PasswordField title="Password" value="secret" onChange={vi.fn()} />);
    expect(screen.getByText('Password')).toBeDefined();
    const input = document.querySelector('input[type="password"]');
    expect(input).toBeTruthy();
  });

  test('shows error', () => {
    render(<PasswordField title="P" value="" error="Required" onChange={vi.fn()} />);
    expect(screen.getByText('Required')).toBeDefined();
  });

  test('shows description', () => {
    render(<PasswordField title="P" value="" description="Min 8 chars" onChange={vi.fn()} />);
    expect(screen.getByText('Min 8 chars')).toBeDefined();
  });
});

describe('OptionsField', () => {
  const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
  ];

  test('renders label and dropdown', () => {
    render(<OptionsField title="Color" value="a" options={options} onChange={vi.fn()} />);
    expect(screen.getByText('Color')).toBeDefined();
    expect(screen.getByText('Alpha')).toBeDefined();
  });

  test('shows error', () => {
    render(<OptionsField title="T" value="a" options={options} error="Bad" onChange={vi.fn()} />);
    expect(screen.getByText('Bad')).toBeDefined();
  });

  test('shows description', () => {
    render(<OptionsField title="T" value="a" options={options} description="Pick one" onChange={vi.fn()} />);
    expect(screen.getByText('Pick one')).toBeDefined();
  });

  test('renders without title', () => {
    render(<OptionsField title="" value="b" options={options} onChange={vi.fn()} />);
    expect(screen.getByText('Beta')).toBeDefined();
  });
});
