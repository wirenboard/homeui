import { makeAutoObservable, runInAction } from 'mobx';
import { closeMatterWindow, getMatterStatus, openMatterWindow, unpairMatterApp } from './api';
import type { MatterStatus, MatterWindow } from './types';

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
  // The window is being opened or closed right now, so the button cannot be pressed
  // twice and says it is busy.
  isChangingWindow = false;
  // The bridge refused or did not answer. 409 lands here too: it means somebody is
  // pairing at this very moment, and the page says so rather than pretending.
  hasWindowFailed = false;

  #timer: ReturnType<typeof setInterval> | null = null;

  // A tab that comes back shows the state of now, not the state of when it was hidden.
  // A field and not a method, because addEventListener and removeEventListener have to
  // be given one and the same function.
  readonly #onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void this.fetch();
    }
  };

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

  /**
   * Opens the pairing window. Whatever comes back, the state is read again right after:
   * the window belongs to the bridge, and /status is what the page may believe.
   */
  async openWindow() {
    return this.#changeWindow(openMatterWindow);
  }

  /** Closes it before its time. */
  async closeWindow() {
    return this.#changeWindow(closeMatterWindow);
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
    document.addEventListener('visibilitychange', this.#onVisibilityChange);
  }

  stopWatching() {
    if (this.#timer !== null) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
    document.removeEventListener('visibilitychange', this.#onVisibilityChange);
  }

  async #changeWindow(call: () => Promise<MatterWindow>) {
    this.isChangingWindow = true;
    this.hasWindowFailed = false;
    let ok = true;
    try {
      const answer = await call();
      ok = answer?.ok !== false;
    } catch {
      ok = false;
    }
    await this.fetch();
    runInAction(() => {
      this.isChangingWindow = false;
      this.hasWindowFailed = !ok;
    });
    return ok;
  }
}
