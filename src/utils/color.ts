export const isHex = (value: string | null) => typeof value === 'string' && value[0] === '#' && value.length === 7;

export const rgbToHex = (red: string, green: string, blue: string) => {
  const r = parseInt(red, 10);
  const g = parseInt(green, 10);
  const b = parseInt(blue, 10);
  const rgb = (r << 16) | (g << 8) | (b << 0);

  return `#${(0x1000000 + rgb).toString(16).slice(1)}`;
};

export const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return `${r};${g};${b}`;
};
