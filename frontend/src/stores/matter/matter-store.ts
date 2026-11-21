import { makeAutoObservable, runInAction } from 'mobx';
import {
  changeMatterCode, closeMatterWindow, getMatterStatus, openMatterWindow, setLocalFabricLabel,
  setMatterSettings, unpairFabric,
} from './api';
import type { MatterSettings, MatterStatus, MatterWindow } from './types';

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
  // The fabric being dropped right now, so the dialog can say so and cannot be used twice.
  unpairingIndex: number | null = null;
  // The last attempt did not go through. Cleared when the next one starts.
  hasUnpairFailed = false;
  // The fabric being labelled right now, so its dialog can say so and cannot be used twice.
  labellingIndex: number | null = null;
  // Kept apart from hasUnpairFailed rather than shared: the two have separate dialogs
  // open at separate times, and one flag would show a failed label inside the unpair
  // dialog of the next fabric the operator opens.
  hasLabelFailed = false;
  // The window is being opened or closed right now, so the button cannot be pressed
  // twice and says it is busy.
  isChangingWindow = false;
  // The bridge refused or did not answer. 409 lands here too: it means somebody is
  // pairing at this very moment, and the page says so rather than pretending.
  hasWindowFailed = false;
  // A switch of the page is on its way to the bridge, so it cannot be thrown twice.
  isSavingSettings = false;
  // The last change of a switch did not go through. Cleared when the next one starts.
  hasSettingsFailed = false;
  // How far the clock of the controller is ahead of the clock of this browser, in
  // milliseconds. Zero for a service that does not say what time it has.
  clockOffset = 0;

  #timer: ReturnType<typeof setInterval> | null = null;
  // Requests are numbered because answers can come back out of order: a poll sent before
  // a change and answered after the re-read that followed it would put the old state
  // back on the page for five seconds - a switch that was thrown springing back.
  #asked = 0;
  #shown = 0;

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
    this.#asked += 1;
    const asked = this.#asked;
    try {
      const status = await getMatterStatus();
      if (asked < this.#shown) {
        return;
      }
      this.#shown = asked;
      runInAction(() => {
        this.status = status;
        if (Number.isFinite(status?.now)) {
          this.clockOffset = status.now - Date.now();
        }
        this.isUnreachable = false;
        this.isLoading = false;
      });
    } catch {
      if (asked < this.#shown) {
        return;
      }
      this.#shown = asked;
      runInAction(() => {
        // The last known state is kept on purpose: a page that empties itself on one
        // failed request is worse than a page with a warning over the data.
        this.isUnreachable = true;
        this.isLoading = false;
      });
    }
  }

  /**
   * Drops one fabric. Whatever the request answers, the state is read again right after:
   * the bridge may have left the fabric and failed to reply, and what /status says is
   * the truth, not what this call returned.
   */
  async unpair(index: number) {
    this.unpairingIndex = index;
    this.hasUnpairFailed = false;
    let ok = true;
    try {
      await unpairFabric(index);
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
   * Labels one fabric, or clears the label when given an empty value. The state is read
   * again right after for the same reason as unpair: /status is the truth, not this answer.
   */
  async setLocalFabricLabel(index: number, value: string) {
    this.labellingIndex = index;
    this.hasLabelFailed = false;
    let ok = true;
    try {
      await setLocalFabricLabel(index, value);
    } catch {
      ok = false;
    }
    await this.fetch();
    runInAction(() => {
      this.labellingIndex = null;
      this.hasLabelFailed = !ok;
    });
    return ok;
  }

  /**
   * Throws switches of the page. The state is read again whatever the answer: the switch
   * shows what the bridge holds, so a change that was refused springs back by itself.
   */
  async setSettings(settings: Partial<MatterSettings>) {
    this.isSavingSettings = true;
    this.hasSettingsFailed = false;
    let ok = true;
    try {
      await setMatterSettings(settings);
    } catch {
      ok = false;
    }
    await this.fetch();
    runInAction(() => {
      this.isSavingSettings = false;
      this.hasSettingsFailed = !ok;
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

  /**
   * Replaces the pairing code of this controller.
   *
   * Shares isChangingWindow and hasWindowFailed with the two above on purpose: from the
   * page's side these are the same thing - one request to the bridge about the code,
   * one busy state, one place a failure is shown - and a third pair of flags would only
   * be three states to keep in step.
   */
  async changeCode() {
    return this.#changeWindow(changeMatterCode);
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
