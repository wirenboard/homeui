// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { JsonBindingsEditor } from './json-bindings-editor';

vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange }: any) => (
    <textarea data-testid="code-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

describe('JsonBindingsEditor', () => {
  function makeStore() {
    return {
      jsonSource: '[{"id":"el1"}]',
      setJsonSource: vi.fn(),
      cancelEditingJson: vi.fn(),
      saveJson: vi.fn(),
    };
  }

  test('renders code editor with json source', () => {
    const store = makeStore();
    render(<JsonBindingsEditor bindingsStore={store as any} />);
    expect(screen.getByTestId('code-editor')).toBeDefined();
    expect((screen.getByTestId('code-editor') as HTMLTextAreaElement).value).toBe('[{"id":"el1"}]');
  });

  test('calls setJsonSource on editor change', () => {
    const store = makeStore();
    render(<JsonBindingsEditor bindingsStore={store as any} />);
    fireEvent.change(screen.getByTestId('code-editor'), { target: { value: '[]' } });
    expect(store.setJsonSource).toHaveBeenCalledWith('[]');
  });

  test('cancel button calls cancelEditingJson', () => {
    const store = makeStore();
    render(<JsonBindingsEditor bindingsStore={store as any} />);
    fireEvent.click(screen.getByText('edit-svg-dashboard.buttons.cancel'));
    expect(store.cancelEditingJson).toHaveBeenCalled();
  });

  test('save button calls saveJson', () => {
    const store = makeStore();
    render(<JsonBindingsEditor bindingsStore={store as any} />);
    fireEvent.click(screen.getByText('edit-svg-dashboard.buttons.save'));
    expect(store.saveJson).toHaveBeenCalled();
  });
});
