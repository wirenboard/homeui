import { useCallback, useEffect, useState } from 'react';
import { type UseTabsArgs } from './types';

export const useTabs = ({
  items,
  defaultTab,
  onBeforeTabChange,
  onAfterTabChange,
}: UseTabsArgs) => {
  const [activeTab, setActiveTab] = useState<string | undefined>(() =>
    defaultTab && items.find((i) => i.id === defaultTab)
      ? defaultTab
      : items[0]?.id
  );

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const onTabChange = useCallback(
    async (next: string) => {
      if (next === activeTab) return;

      const allow = onBeforeTabChange
        ? await onBeforeTabChange(next, activeTab!)
        : true;

      if (!allow) return;

      const prev = activeTab!;
      setActiveTab(next);
      onAfterTabChange?.(next, prev);
    },
    [activeTab, onBeforeTabChange, onAfterTabChange]
  );

  useEffect(() => {
    if (!items.find((i) => i.id === activeTab)) {
      const fallback =
        (defaultTab && items.find((i) => i.id === defaultTab)?.id) ||
        items[0]?.id;

      if (fallback && fallback !== activeTab) {
        const prev = activeTab;
        setActiveTab(fallback);
        if (prev && fallback !== prev) {
          onAfterTabChange?.(fallback, prev);
        }
      }
    }
  }, [items]);

  return {
    activeTab,
    onTabChange,
  };
};
