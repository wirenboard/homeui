import { request } from '@/utils/request';
import type { MatterStatus, MatterWindow } from './types';

export const getMatterStatus = async () => {
  const { data } = await request.get<MatterStatus>('/matter/status');
  return data;
};

/**
 * The QR code is drawn by the service, so the page only points an img at it. The version
 * keeps the browser from showing the code of a previous pairing out of its cache.
 */
export const pairingQrUrl = (version: string) => `/matter/pairing.svg?v=${encodeURIComponent(version)}`;

/**
 * Opens the pairing window, which is the only way the bridge becomes pairable at all:
 * it comes up closed. The code does not change when a window opens: it is this
 * controller's own code, drawn once and kept, so an app that remembered it - which is
 * how a third-party "Share" screen draws its QR - keeps working. Replacing it is a
 * separate, deliberate act: changeMatterCode below.
 *
 * The code is not in this answer and must not be: it is served from /status alone, so
 * there is one place that decides whether a credential may be shown.
 */
export const openMatterWindow = async () => {
  const { data } = await request.post<MatterWindow>('/matter/pair');
  return data;
};

/** Closes the window before its time, and the code stops being offered. */
export const closeMatterWindow = async () => {
  const { data } = await request.post<MatterWindow>('/matter/pair/close');
  return data;
};

/**
 * Draws a new pairing code for this controller. For when the old one has got out - a
 * screenshot in a ticket, a diagnostic bundle - and not as a matter of routine: an app
 * that remembered the old code will offer the wrong one afterwards.
 *
 * The bridge refuses while a window is open, with a 409 the store treats like any other
 * failure. The new code is not in this answer either, for the same reason as above.
 */
export const changeMatterCode = async () => {
  const { data } = await request.post<MatterWindow>('/matter/pair/new-code');
  return data;
};

/**
 * Drops one app. The index is the one /status gave for it, so the page sends back what
 * it was shown. The bridge answers 409 when the app is already gone, which the store
 * treats like any other failure: it reloads the state and the page shows what is true.
 */
export const unpairMatterApp = async (index: number) => {
  await request.post('/matter/unpair', { index });
};
