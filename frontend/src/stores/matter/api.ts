import { request } from '@/utils/request';
import type { MatterStatus } from './types';

export const getMatterStatus = async () => request.get<MatterStatus>(
  '/matter/status',
).then(({ data }) => data);

/**
 * The QR code is drawn by the service, so the page only points an img at it. The version
 * keeps the browser from showing the code of a previous pairing out of its cache.
 */
export const pairingQrUrl = (version: string) => `/matter/pairing.svg?v=${encodeURIComponent(version)}`;
