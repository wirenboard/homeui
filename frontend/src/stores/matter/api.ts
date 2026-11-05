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

/**
 * Drops one app. The index is the one /status gave for it, so the page sends back what
 * it was shown. The bridge answers 409 when the app is already gone, which the store
 * treats like any other failure: it reloads the state and the page shows what is true.
 */
export const unpairMatterApp = async (index: number) => request.post<void>(
  '/matter/unpair',
  { index },
);
