// Immutable update helper. Returns a new array where the item at `index` is
// shallow-merged with `changes`; other items keep their references so React
// can detect the change and re-render.
//
// Used with:
//   updateItem<SmartDeviceCapability>(capabilities, i, { retrievable: false })
//   updateItem<SmartDeviceProperty>(properties, i, { reportable: false })
export function updateItem<T>(
  items: T[],
  index: number,
  changes: Partial<T>,
): T[] {
  const result: T[] = [];
  for (let i = 0; i < items.length; i += 1) {
    if (i === index) {
      result.push({ ...items[i], ...changes });
    } else {
      result.push(items[i]);
    }
  }
  return result;
}
