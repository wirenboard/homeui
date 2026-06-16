// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Tree } from './tree';
import type { TreeItem } from './types';

const flat: TreeItem[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
];

const nested: TreeItem[] = [
  {
    id: 'parent',
    label: 'Parent',
    children: [
      { id: 'child1', label: 'Child 1' },
      { id: 'child2', label: 'Child 2' },
    ],
  },
  { id: 'solo', label: 'Solo' },
];

describe('Tree', () => {
  test('renders all items', () => {
    render(<Tree data={flat} />);
    expect(screen.getByText('Alpha')).toBeDefined();
    expect(screen.getByText('Beta')).toBeDefined();
    expect(screen.getByText('Gamma')).toBeDefined();
  });

  test('has tree role', () => {
    render(<Tree data={flat} />);
    expect(screen.getByRole('tree')).toBeDefined();
  });

  test('renders treeitems', () => {
    render(<Tree data={flat} />);
    expect(screen.getAllByRole('treeitem')).toHaveLength(3);
  });

  test('applies size class', () => {
    const { container } = render(<Tree data={flat} size="small" />);
    expect(container.querySelector('.tree-s')).toBeTruthy();
  });

  test('renders nested children', () => {
    render(<Tree data={nested} />);
    expect(screen.getByText('Parent')).toBeDefined();
    expect(screen.getByText('Child 1')).toBeDefined();
    expect(screen.getByText('Child 2')).toBeDefined();
  });

  test('collapses children on chevron click', () => {
    render(<Tree data={nested} />);
    expect(screen.getByText('Child 1')).toBeDefined();

    const collapseBtn = screen.getAllByRole('button').find(
      (btn) => btn.classList.contains('tree-collapseButton'),
    )!;
    fireEvent.click(collapseBtn);

    expect(screen.queryByText('Child 1')).toBeNull();
  });

  test('expands children on second chevron click', () => {
    render(<Tree data={nested} />);
    const collapseBtn = screen.getAllByRole('button').find(
      (btn) => btn.classList.contains('tree-collapseButton'),
    )!;

    fireEvent.click(collapseBtn);
    expect(screen.queryByText('Child 1')).toBeNull();

    fireEvent.click(collapseBtn);
    expect(screen.getByText('Child 1')).toBeDefined();
  });

  test('keyboard Enter toggles collapse', () => {
    render(<Tree data={nested} />);
    const collapseBtn = screen.getAllByRole('button').find(
      (btn) => btn.classList.contains('tree-collapseButton'),
    )!;

    fireEvent.keyDown(collapseBtn, { key: 'Enter' });
    expect(screen.queryByText('Child 1')).toBeNull();
  });

  test('calls onItemClick when item clicked', () => {
    const onClick = vi.fn();
    render(<Tree data={flat} onItemClick={onClick} />);
    fireEvent.click(screen.getByText('Beta'));
    expect(onClick).toHaveBeenCalledWith(flat[1]);
  });

  test('highlights first item by default (uncontrolled)', () => {
    const { container } = render(<Tree data={flat} />);
    expect(container.querySelector('.tree-itemActive')).toBeTruthy();
  });

  test('controlled activeId highlights correct item', () => {
    const { container } = render(<Tree data={flat} activeId="b" />);
    const activeItem = container.querySelector('.tree-itemActive');
    expect(activeItem).toBeTruthy();
    expect(activeItem!.textContent).toContain('Beta');
  });

  test('disables all items', () => {
    render(<Tree data={flat} isDisabled />);
    screen.getAllByRole('treeitem').forEach((item) => {
      const btn = item.querySelector('button') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });
  });

  describe('selectable mode', () => {
    test('renders checkboxes', () => {
      render(
        <Tree data={flat} selectedIds={new Set()} selectable onSelectionChange={vi.fn()} />,
      );
      expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    });

    test('checks selected items', () => {
      render(
        <Tree
          data={flat}
          selectedIds={new Set(['b'])}
          selectable
          onSelectionChange={vi.fn()}
        />,
      );
      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      expect(checkboxes[0].checked).toBe(false);
      expect(checkboxes[1].checked).toBe(true);
      expect(checkboxes[2].checked).toBe(false);
    });

    test('toggles selection on click', () => {
      const onChange = vi.fn();
      render(
        <Tree data={flat} selectedIds={new Set()} selectable onSelectionChange={onChange} />,
      );
      fireEvent.click(screen.getByText('Alpha'));
      expect(onChange).toHaveBeenCalledWith(new Set(['a']));
    });

    test('deselects on click when already selected', () => {
      const onChange = vi.fn();
      render(
        <Tree data={flat} selectedIds={new Set(['a'])} selectable onSelectionChange={onChange} />,
      );
      fireEvent.click(screen.getByText('Alpha'));
      expect(onChange).toHaveBeenCalledWith(new Set());
    });

    test('selects all children when parent clicked', () => {
      const onChange = vi.fn();
      render(
        <Tree data={nested} selectedIds={new Set()} selectable onSelectionChange={onChange} />,
      );
      fireEvent.click(screen.getByText('Parent'));
      expect(onChange).toHaveBeenCalledWith(new Set(['child1', 'child2']));
    });

    test('deselects all children when fully-selected parent clicked', () => {
      const onChange = vi.fn();
      render(
        <Tree
          data={nested}
          selectedIds={new Set(['child1', 'child2'])}
          selectable
          onSelectionChange={onChange}
        />,
      );
      fireEvent.click(screen.getByText('Parent'));
      expect(onChange).toHaveBeenCalledWith(new Set());
    });

    test('no active highlight in selectable mode', () => {
      const { container } = render(
        <Tree data={flat} selectedIds={new Set()} selectable onSelectionChange={vi.fn()} />,
      );
      expect(container.querySelector('.tree-itemActive')).toBeNull();
    });
  });
});
