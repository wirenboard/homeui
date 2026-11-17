import classNames from 'classnames';
import { useState, useEffect, useCallback } from 'react';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import { Checkbox } from '@/components/checkbox';
import type { TreeItem, TreeProps } from '@/components/tree/types';
import './styles.css';

function getAllLeafIds(item: TreeItem): string[] {
  if (!item.children?.length) {
    return [item.id];
  }
  return item.children.flatMap(getAllLeafIds);
}

type CheckState = 'checked' | 'unchecked' | 'indeterminate';

function getCheckState(item: TreeItem, selectedIds: Set<string>): CheckState {
  if (!item.children?.length) {
    return selectedIds.has(item.id) ? 'checked' : 'unchecked';
  }
  const leafIds = getAllLeafIds(item);
  const selectedCount = leafIds.filter((id) => selectedIds.has(id)).length;
  if (selectedCount === 0) return 'unchecked';
  if (selectedCount === leafIds.length) return 'checked';
  return 'indeterminate';
}

export const Tree = ({
  data,
  size = 'default',
  isDisabled,
  onItemClick,
  activeId,
  selectable,
  selectedIds,
  onSelectionChange,
}: TreeProps) => {
  const [internalActive, setInternalActive] = useState<string>();
  const isControlled = activeId !== undefined;
  const active = isControlled ? activeId : internalActive;

  useEffect(() => {
    if (!selectable && !isControlled && data.length && !internalActive) {
      setInternalActive(data.at(0).id);
    }
  }, [data]);

  const toggleItem = useCallback(
    (item: TreeItem) => {
      if (!selectedIds || !onSelectionChange) return;
      const next = new Set(selectedIds);
      const leafIds = getAllLeafIds(item);
      const state = getCheckState(item, selectedIds);
      if (state === 'checked') {
        leafIds.forEach((id) => next.delete(id));
      } else {
        leafIds.forEach((id) => next.add(id));
      }
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange],
  );

  const TreeNode = ({ item, level = 0 }: { item: TreeItem; level?: number }) => {
    const [collapsed, setCollapsed] = useState(false);
    const hasChildren = !!item.children?.length;

    useEffect(() => {
      if (item.children?.length) setCollapsed(false);
    }, [item.children?.length]);

    const basePadding = level ? level * 18 : 4;
    const collapseButtonWidth = 28; // 12px icon + 4px*2 padding + 8px gap
    const paddingLeft = hasChildren
      ? basePadding
      : basePadding + (selectable ? collapseButtonWidth : 12);

    const checkState = selectable && selectedIds ? getCheckState(item, selectedIds) : undefined;

    return (
      <li
        role="treeitem"
        className={classNames('tree-item', {
          'tree-itemActive': !selectable && active === item.id,
        })}
      >
        <button
          className="tree-itemButton"
          style={{ paddingLeft: `${paddingLeft}px` }}
          disabled={isDisabled}
          onClick={() => {
            if (selectable) {
              toggleItem(item);
            } else {
              onItemClick?.(item);
              if (!isControlled) {
                setInternalActive(item.id);
              }
            }
          }}
        >
          {hasChildren && (
            <span
              role="button"
              tabIndex={0}
              className="tree-collapseButton"
              onClick={(ev) => {
                ev.stopPropagation();
                setCollapsed(!collapsed);
              }}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  setCollapsed(!collapsed);
                }
              }}
            >
              {collapsed ? (
                <ChevronRightIcon className="tree-collapseIcon" />
              ) : (
                <ChevronDownIcon className="tree-collapseIcon" />
              )}
            </span>
          )}
          {selectable && checkState !== undefined && (
            <Checkbox
              checked={checkState === 'checked'}
              indeterminate={checkState === 'indeterminate'}
              className="tree-checkbox"
              onChange={() => toggleItem(item)}
            />
          )}
          {item.label}
        </button>

        {!collapsed && hasChildren && (
          <ul className="tree-children" role="group">
            {item.children!.map((child) => (
              <TreeNode key={child.id} item={child} level={level + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <ul
      className={classNames('tree', {
        'tree-m': size === 'default',
        'tree-s': size === 'small',
      })}
      role="tree"
    >
      {data.map((item) => (
        <TreeNode key={item.id} item={item} level={0} />
      ))}
    </ul>
  );
};
