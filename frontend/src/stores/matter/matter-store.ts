import { makeAutoObservable, runInAction } from 'mobx';
import { getMatterStatus, unpairMatterApp } from './api';
import type { MatterStatus } from './types';

/**
 * How often the page asks the bridge again. The state changes when somebody scans the
 * code with a phone, so the page has to notice without being reloaded; polling is
 * enough for something that changes once a month, and it costs one request to a unix
 * socket on the controller itself.
 */
export const POLL_INTERVAL_MS = 5000;

export default class MatterStore {
  status: MatterStatus | null = null;
  // The first answer has not arrived yet. Not the same as "no bridge".
  isLoading = true;
  // The service is installed but does not answer: stopped, crashed, or still starting.
  isUnreachable = false;
  // The app being dropped right now, so the dialog can say so and cannot be used twice.
  unpairingIndex: number | null = null;
  // The last attempt did not go through. Cleared when the next one starts.
  hasUnpairFailed = false;

  #timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async fetch() {
    try {
      const status = await getMatterStatus();
      runInAction(() => {
        this.status = status;
        this.isUnreachable = false;
        this.isLoading = false;
      });
    } catch {
      runInAction(() => {
        // The last known state is kept on purpose: a page that empties itself on one
        // failed request is worse than a page with a warning over the data.
        this.isUnreachable = true;
        this.isLoading = false;
      });
    }
  }

  /**
   * Drops one app. Whatever the request answers, the state is read again right after:
   * the bridge may have left the fabric and failed to reply, and what /status says is
   * the truth, not what this call returned.
   */
  async unpair(index: number) {
    this.unpairingIndex = index;
    this.hasUnpairFailed = false;
    let ok = true;
    try {
      await unpairMatterApp(index);
    } catch {
      ok = false;
    }
    await this.fetch();
    runInAction(() => {
      this.unpairingIndex = null;
      this.hasUnpairFailed = !ok;
    });
    return ok;
  }

  /** Reads the state now and keeps it up to date while the tab is visible. */
  startWatching() {
    // The store is a singleton and the page mounts twice under StrictMode, so a second
    // start without a stop would leave the first timer running forever.
    this.stopWatching();
    void this.fetch();
    this.#timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void this.fetch();
      }
    }, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  stopWatching() {
    if (this.#timer !== null) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  /** A tab that comes back shows the state of now, not the state of when it was hidden. */
  onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      void this.fetch();
    }
  }
}
