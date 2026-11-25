import { request } from '@/utils/request';
import type { MatterSettings, MatterStatus, MatterWindow } from './types';

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
 * Drops one fabric. The index is the one /status gave for it, so the page sends back what
 * it was shown. The bridge answers 409 when the app is already gone, which the store
 * treats like any other failure: it reloads the state and the page shows what is true.
 */
export const unpairFabric = async (index: number) => {
  await request.post('/matter/unpair', { index });
};

/**
 * Has the bridge ask one fabric whether it is still there. It answers once the app has
 * answered or not, which can take a quarter of a minute.
 */
export const checkFabricLink = async (index: number) => {
  await request.post('/matter/fabric-check', { index });
};

/**
 * Sets the label this controller keeps for one fabric. An empty value clears it, and the
 * bridge falls back to adminFabricLabel, then to the name of the vendor; the page says
 * the fabric number where there is neither (MatterFabric.label).
 *
 * It never reaches the app: the only standard place for a label is the fabric's own
 * Label, and the command that writes it may only be sent by the administrator of that
 * fabric, not by the device it paired with.
 */
export const setLocalFabricLabel = async (index: number, localFabricLabel: string) => {
  await request.post('/matter/local-fabric-label', { index, localFabricLabel });
};

/**
 * Throws switches of this page. The bridge answers once the change is kept and said to
 * the apps, so there is no restart to wait for; it refuses a name it does not know with
 * a 400, which the store treats like any other failure.
 */
export const setMatterSettings = async (settings: Partial<MatterSettings>) => {
  await request.post('/matter/settings', settings);
};
