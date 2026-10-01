// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { BooleanField } from './boolean-field';
import { FormButtonGroup } from './button-group';
import { FieldDescription } from './field-description';
import { FieldError } from './field-error';
import { FieldLabel } from './field-label';
import { FormField } from './form-field';
import { StringField } from './string-field';

describe('FieldLabel', () => {
  test('renders label with title', () => {
    render(<FieldLabel title="Name" inputId="name-input" />);
    const label = screen.getByText('Name');
    expect(label.tagName).toBe('LABEL');
    expect(label.getAttribute('for')).toBe('name-input');
  });
});

describe('FieldError', () => {
  test('renders error message', () => {
    render(<FieldError error="Required field" />);
    expect(screen.getByText('Required field')).toBeDefined();
  });

  test('sets id attribute', () => {
    render(<FieldError id="err-1" error="Oops" />);
    expect(screen.getByText('Oops').id).toBe('err-1');
  });
});

describe('FieldDescription', () => {
  test('renders description text', () => {
    render(<FieldDescription description="Help text" />);
    expect(screen.getByText('Help text')).toBeDefined();
  });

  test('renders default text with prefix/postfix', () => {
    const { container } = render(<FieldDescription defaultText="42" />);
    expect(screen.getByText('42')).toBeDefined();
    expect(container.textContent).toContain('forms.default-text-prefix');
    expect(container.textContent).toContain('forms.default-text-postfix');
  });

  test('renders both description and default text', () => {
    render(<FieldDescription description="Desc" defaultText="Default" />);
    expect(screen.getByText('Desc')).toBeDefined();
    expect(screen.getByText('Default')).toBeDefined();
  });

  test('replaces <br> with newlines in description', () => {
    const { container } = render(<FieldDescription description="line1<br>line2" />);
    const desc = container.querySelector('.form-descriptionText');
    expect(desc!.textContent).toContain('line1\nline2');
  });
});

describe('FormField', () => {
  test('renders children', () => {
    render(<FormField>Content</FormField>);
    expect(screen.getByText('Content')).toBeDefined();
  });

  test('shows error when present', () => {
    render(<FormField error="Bad value">x</FormField>);
    expect(screen.getByText('Bad value')).toBeDefined();
  });

  test('applies error class when error present', () => {
    const { container } = render(<FormField error="Err">x</FormField>);
    expect(container.querySelector('.form-fieldError')).toBeTruthy();
  });

  test('shows description when present', () => {
    render(<FormField description="Help text">x</FormField>);
    expect(screen.getByText('Help text')).toBeDefined();
  });

  test('shows default text', () => {
    render(<FormField defaultText="Default">x</FormField>);
    expect(screen.getByText('Default')).toBeDefined();
  });

  test('hides error and description when not set', () => {
    const { container } = render(<FormField>x</FormField>);
    expect(container.querySelector('.form-errorText')).toBeNull();
    expect(container.querySelector('.form-fieldDescription')).toBeNull();
  });
});

describe('FormButtonGroup', () => {
  test('renders children in button group', () => {
    const { container } = render(
      <FormButtonGroup><button>Save</button></FormButtonGroup>,
    );
    expect(container.querySelector('.form-buttonGroup')).toBeTruthy();
    expect(screen.getByText('Save')).toBeDefined();
  });
});

describe('StringField', () => {
  test('renders label and input', () => {
    render(<StringField title="Username" value="john" onChange={vi.fn()} />);
    expect(screen.getByText('Username')).toBeDefined();
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('john');
  });

  test('shows error', () => {
    render(<StringField title="X" value="" error="Required" onChange={vi.fn()} />);
    expect(screen.getByText('Required')).toBeDefined();
  });

  test('shows description', () => {
    render(<StringField title="X" value="" description="Enter name" onChange={vi.fn()} />);
    expect(screen.getByText('Enter name')).toBeDefined();
  });

  test('renders without title', () => {
    render(<StringField value="val" onChange={vi.fn()} />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('val');
  });

  test('calls onChange', () => {
    const onChange = vi.fn();
    render(<StringField title="X" value="old" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith('new');
  });
});

describe('BooleanField', () => {
  test('renders title and switch by default', () => {
    const { container } = render(
      <BooleanField title="Active" value={true} onChange={vi.fn()} />,
    );
    expect(screen.getByText('Active')).toBeDefined();
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  test('renders checkbox variant', () => {
    render(
      <BooleanField title="Agree" value={false} view="checkbox" onChange={vi.fn()} />,
    );
    expect(screen.getByRole('checkbox')).toBeDefined();
  });

  test('calls onChange', () => {
    const onChange = vi.fn();
    render(<BooleanField title="Flag" value={false} view="checkbox" onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test('disables control', () => {
    const { container } = render(
      <BooleanField title="X" value={false} isDisabled onChange={vi.fn()} />,
    );
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.disabled).toBe(true);
  });

  test('shows error', () => {
    render(<BooleanField title="X" value={false} error="Invalid" onChange={vi.fn()} />);
    expect(screen.getByText('Invalid')).toBeDefined();
  });
});
