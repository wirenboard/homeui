import { type KeyboardEvent, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/dialog';
import { Input } from '@/components/input';
import { Tree, type TreeItem } from '@/components/tree';
import type { ListCommandsEntry } from '@/stores/dali/types';

interface CatalogModalProps {
  isOpen: boolean;
  catalog: ListCommandsEntry[];
  onClose: () => void;
  onSelect: (_entry: ListCommandsEntry) => void;
}

const CATEGORY_PREFIX = 'cat::';
const COMMAND_PREFIX = 'cmd::';

const buildCatalogTree = (
  entries: ListCommandsEntry[],
  query: string,
): TreeItem[] => {
  const grouped = new Map<string, ListCommandsEntry[]>();
  for (const entry of entries) {
    const category = entry.category || 'other';
    const list = grouped.get(category) ?? [];
    list.push(entry);
    grouped.set(category, list);
  }

  const result: TreeItem[] = [];
  for (const [category, list] of grouped) {
    const categoryMatches = !query || category.toLowerCase().includes(query);
    const filtered = list.filter((entry) => {
      if (categoryMatches) return true;
      return entry.name.toLowerCase().includes(query);
    });
    if (!filtered.length) continue;
    result.push({
      id: `${CATEGORY_PREFIX}${category}`,
      label: <span className="dali-busCommands-catalogCategoryLabel">{category}</span>,
      children: filtered.map((entry) => ({
        id: `${COMMAND_PREFIX}${entry.name}`,
        label: <span className="dali-busCommands-catalogItemName">{entry.name}</span>,
      })),
    });
  }
  return result;
};

const findFirstCommandLeaf = (items: TreeItem[]): TreeItem | null => {
  for (const item of items) {
    if (item.id.startsWith(COMMAND_PREFIX)) return item;
    if (item.children) {
      const inner = findFirstCommandLeaf(item.children);
      if (inner) return inner;
    }
  }
  return null;
};

export const CatalogModal = ({
  isOpen,
  catalog,
  onClose,
  onSelect,
}: CatalogModalProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const treeRef = useRef<HTMLDivElement>(null);

  const tree = useMemo(
    () => buildCatalogTree(catalog, search.trim().toLowerCase()),
    [catalog, search],
  );

  const entriesByName = useMemo(() => {
    const map = new Map<string, ListCommandsEntry>();
    catalog.forEach((entry) => map.set(entry.name, entry));
    return map;
  }, [catalog]);

  const onItemClick = (item: TreeItem) => {
    if (!item.id.startsWith(COMMAND_PREFIX)) return;
    const name = item.id.slice(COMMAND_PREFIX.length);
    const entry = entriesByName.get(name);
    if (entry) onSelect(entry);
  };

  const focusFirstTreeItem = () => {
    const button = treeRef.current?.querySelector<HTMLButtonElement>('.tree-itemButton');
    button?.focus();
  };

  const onSearchKeyDown = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      focusFirstTreeItem();
    }
  };

  const onSearchEnter = () => {
    const firstCommand = findFirstCommandLeaf(tree);
    if (!firstCommand) return;
    const name = firstCommand.id.slice(COMMAND_PREFIX.length);
    const entry = entriesByName.get(name);
    if (entry) onSelect(entry);
  };

  return (
    <Dialog
      isOpened={isOpen}
      heading={t('dali.labels.commands-catalog-title')}
      width={640}
      onClose={onClose}
    >
      <div className="dali-busCommands-catalog">
        <div onKeyDown={onSearchKeyDown}>
          <Input
            value={search}
            placeholder={t('dali.labels.commands-catalog-search')}
            ariaLabel={t('dali.labels.commands-catalog-search')}
            isFullWidth
            autoFocus
            onChange={(value) => setSearch(String(value))}
            onEnter={onSearchEnter}
          />
        </div>

        {tree.length === 0 ? (
          <div className="dali-busCommands-catalogEmpty">
            {t('dali.labels.commands-catalog-empty')}
          </div>
        ) : (
          <div className="dali-busCommands-catalogTree" ref={treeRef}>
            <Tree
              data={tree}
              size="small"
              onItemClick={onItemClick}
            />
          </div>
        )}
      </div>
    </Dialog>
  );
};
