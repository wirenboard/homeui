export const generateNextId = (items: string[], base: string) => {
  let maxNumber = 0;

  items.forEach((item) => {
    if (item.startsWith(base)) {
      const suffix = item.slice(base.length);
      const match = suffix.match(/^\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  });

  return `${base}${maxNumber + 1}`;
};
