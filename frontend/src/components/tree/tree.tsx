import classNames from 'classnames';
import { useState, useEffect } from 'react';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import type { TreeItem, TreeProps } from '@/components/tree/types';
import './styles.css';


export const Tree = ({ data, isDisabled, onItemClick }: TreeProps) => {
  const [active, setActive] = useState<string>();

  useEffect(() => {
    if (data.length) {
      setActive(data.at(0).id);
    }
  }, [data]);

  const TreeNode = ({ item, level = 0 }: { item: TreeItem; level?: number }) => {
    const [collapsed, setCollapsed] = useState(false);
    const hasChildren = !!item.children?.length;

    useEffect(() => {
      if (item.children?.length) setCollapsed(false);
    }, [item.children?.length]);

    const basePadding = level ? level * 18 : 4;
    const paddingLeft = hasChildren ? basePadding : basePadding + 12;

    return (
      <li
        role="treeitem"
        className={classNames('tree-item', {
          'tree-itemActive': active === item.id,
        })}
      >
        <button
          className="tree-itemButton"
          style={{ paddingLeft: `${paddingLeft}px` }}
          disabled={isDisabled}
          onClick={() => {
            onItemClick?.(item);
            setActive(item.id);
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
    <ul className="tree" role="tree">
      {data.map((item) => (
        <TreeNode key={item.id} item={item} level={0} />
      ))}
    </ul>
  );
};
