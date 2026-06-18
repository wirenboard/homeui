export function getOverflowIds(
  tabs: { id: string }[],
  tabWidths: Record<string, number>,
  areaWidth: number,
  activeId: string | null,
  overflowBtnSpace: number,
): Set<string> {
  if (tabs.length === 0 || areaWidth === 0) return new Set();

  let total = 0;
  for (const tab of tabs) total += tabWidths[tab.id] ?? 0;
  if (total <= areaWidth) return new Set();

  let available = areaWidth - overflowBtnSpace;

  const visibleIds = new Set<string>();

  if (activeId && tabWidths[activeId]) {
    if (tabWidths[activeId] <= available) {
      available -= tabWidths[activeId];
      visibleIds.add(activeId);
    }
  } else if (activeId) {
    visibleIds.add(activeId);
  }

  for (const tab of tabs) {
    if (tab.id === activeId) continue;
    const w = tabWidths[tab.id] ?? 0;
    if (w <= available) {
      visibleIds.add(tab.id);
      available -= w;
    }
  }

  return new Set(tabs.filter((t) => !visibleIds.has(t.id)).map((t) => t.id));
}
