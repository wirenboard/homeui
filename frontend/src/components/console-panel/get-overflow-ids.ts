/**
 * Smallest width (px) at which a shrunk active tab is still usable — an
 * ellipsised label plus its close button. Below this the active tab overflows
 * (like a regular tab) so the row collapses to the overflow button instead of
 * showing a clipped sliver.
 */
const MIN_ACTIVE_TAB_WIDTH = 48;

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

  // The active tab stays visible and shrinks with an ellipsis (see styles.css)
  // rather than moving to the overflow menu — but only while there is room for a
  // usable chip. Below that it overflows too, so the row collapses to just the
  // overflow button instead of showing a clipped sliver.
  if (activeId) {
    const activeWidth = tabWidths[activeId] ?? 0;
    if (activeWidth <= available) {
      visibleIds.add(activeId);
      available -= activeWidth;
    } else if (available >= MIN_ACTIVE_TAB_WIDTH) {
      // Too wide to fit, but wide enough to shrink into the remaining space,
      // which then leaves no room for any other tab.
      visibleIds.add(activeId);
      available = 0;
    }
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
