import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { type UrlControl } from './types';

export const encodeControls = (
  controls: Array<UrlControl>,
  startDate?: number,
  endDate?: number
) => {
  const data = {
    c: controls,
    s: startDate,
    e: endDate,
  };
  return encodeURIComponent(compressToEncodedURIComponent(JSON.stringify(data)));
};

export const decode = (data?: string) => {
  try {
    const decompressed = decodeURIComponent(data ?? '');
    const res = JSON.parse(decompressFromEncodedURIComponent(decodeURIComponent(decompressed)) ?? '{}');

    if (res.s) {
      res.s = new Date(res.s);
    }
    if (res.e) {
      res.e = new Date(res.e);
    }
    return res;
  } catch (reason) {
    return {};
  }
};
