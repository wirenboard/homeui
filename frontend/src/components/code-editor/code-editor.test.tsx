// @vitest-environment happy-dom
// The underlying @uiw/react-codemirror reconfigures the whole CodeMirror
// extension stack whenever its extensions or onChange props change
// identity. Pages re-render per keystroke with inline handlers, so
// CodeEditor must hand the library identity-stable props and rebuild the
// stack only when its actual inputs change.
import { EditorView, runScopeHandlers } from '@codemirror/view';
import { render } from '@testing-library/react';
import { forwardRef } from 'react';
import { CodeEditor } from './code-editor';

const capturedProps: any[] = [];
vi.mock('@uiw/react-codemirror', () => ({
  __esModule: true,
  default: forwardRef((props: any, _ref: any) => {
    capturedProps.push(props);
    return <div data-testid="cm" />;
  }),
}));
vi.mock('@/stores/ui', () => ({ uiStore: { resolvedTheme: 'light' } }));

beforeEach(() => {
  capturedProps.length = 0;
});

const stableExtensions: any[] = [];

describe('CodeEditor extension stack stability', () => {
  test('a rerender with new inline onSave/onChange hands CodeMirror the same extensions and onChange', () => {
    const { rerender } = render(
      <CodeEditor
        text="a"
        extensions={stableExtensions}
        withBreakpoints={false}
        onChange={() => {}}
        onSave={() => {}}
      />,
    );
    const before = capturedProps.at(-1);
    rerender(
      <CodeEditor
        text="ab"
        extensions={stableExtensions}
        withBreakpoints={false}
        onChange={() => {}}
        onSave={() => {}}
      />,
    );
    const after = capturedProps.at(-1);
    expect(after.extensions).toBe(before.extensions);
    expect(after.onChange).toBe(before.onChange);
  });

  test('a genuinely new extensions prop still rebuilds the stack', () => {
    const { rerender } = render(
      <CodeEditor text="a" extensions={stableExtensions} withBreakpoints={false} onChange={() => {}} />,
    );
    const before = capturedProps.at(-1);
    rerender(
      <CodeEditor
        text="a"
        extensions={[EditorView.editable.of(false)]}
        withBreakpoints={false}
        onChange={() => {}}
      />,
    );
    expect(capturedProps.at(-1).extensions).not.toBe(before.extensions);
  });

  test('Mod-s runs the latest onSave through the unchanged keymap', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <CodeEditor text="a" extensions={stableExtensions} withBreakpoints={false} onChange={() => {}} onSave={first} />,
    );
    const stack = capturedProps.at(-1).extensions;
    rerender(
      <CodeEditor text="a" extensions={stableExtensions} withBreakpoints={false} onChange={() => {}} onSave={second} />,
    );
    expect(capturedProps.at(-1).extensions).toBe(stack); // keymap not rebuilt...
    const view = new EditorView({ extensions: stack });
    try {
      const handled = runScopeHandlers(
        view, new KeyboardEvent('keydown', { key: 's', ctrlKey: true }), 'editor',
      );
      expect(handled).toBe(true);
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1); // ...yet the latest handler runs
    } finally {
      view.destroy();
    }
  });

  test('the stable onChange bridges to the latest handler prop', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <CodeEditor text="a" extensions={stableExtensions} withBreakpoints={false} onChange={first} />,
    );
    rerender(
      <CodeEditor text="a" extensions={stableExtensions} withBreakpoints={false} onChange={second} />,
    );
    capturedProps.at(-1).onChange('typed text');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('typed text');
  });
});
