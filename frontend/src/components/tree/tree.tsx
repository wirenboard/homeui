import classNames from 'classnames';
import { useState, useEffect } from 'react';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import type { TreeItem, TreeProps } from '@/components/tree/types';
import { observer } from 'mobx-react-lite';
import './styles.css';

const TreeNode = observer(({ 
  item, 
  level, 
  activeId, 
  isDisabled, 
  onClick 
}: {
  item: TreeItem;
  level: number;
  activeId?: string;
  isDisabled?: boolean;
  onClick?: (item: TreeItem) => void;
}) => {
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
        'tree-itemActive': activeId === item.id,
      })}
    >
      <button
        className="tree-itemButton"
        style={{ paddingLeft: `${paddingLeft}px` }}
        disabled={isDisabled}
        onClick={() => onClick(item)}
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
            <TreeNode key={child.id} item={child} level={level + 1} activeId={activeId} isDisabled={isDisabled} onClick={onClick} />
          ))}
        </ul>
      )}
    </li>
  );
});


export const Tree = observer(({ data, isDisabled, onItemClick }: TreeProps) => {
  const [active, setActive] = useState<string>();

  useEffect(() => {
    if (data.length) {
      setActive(data.at(0).id);
    }
  }, [data]);

  const handleItemClick = (item: TreeItem) => {
    setActive(item.id);
    onItemClick?.(item);
  };

  return (
    <ul className="tree" role="tree">
      {data.map((item) => (
        <TreeNode key={item.id} item={item} level={0} activeId={active} isDisabled={isDisabled} onClick={handleItemClick} />
      ))}
    </ul>
  );
});
