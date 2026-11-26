import { makeAutoObservable, runInAction } from 'mobx';
import {
  changeMatterCode, checkFabricLink, closeMatterWindow, getMatterStatus, openMatterWindow,
  resetMatterBridge, setLocalFabricLabel, setMatterSettings, unpairFabric,
} from './api';
import type { MatterSettings, MatterStatus, MatterWindow } from './types';

/**
 * How long a bridge that does not answer is taken to be starting: after a restart of the
 * service or an update of its package it comes back in three quarters of a minute on a
 * controller. The last app leaving is not such a case - the bridge goes on answering then.
 */
export const STARTING_MS = 120_000;

/**
 * How often the page asks the bridge again. The state changes when somebody scans the
 * code with a phone, so the page has to notice without being reloaded; polling is
 * enough for something that changes once a month, and it costs one request to a unix
 * socket on the controller itself.
 */
export const POLL_INTERVAL_MS = 5000;

// How far before its time a window may end and still count as run out.
const WINDOW_END_SLACK_MS = 2000;

export default class MatterStore {
  status: MatterStatus | null = null;
  // The first answer has not arrived yet. Not the same as "no bridge".
  isLoading = true;
  // The service is installed but does not answer: stopped, crashed, or still starting.
  isUnreachable = false;
  // How long it has not answered, as of the last request that failed: the bridge takes
  // most of a minute to start, and the page does not call that a failure.
  silentFor = 0;
  #silentSince: number | null = null;
  // The fabric being dropped right now, so the dialog can say so and cannot be used twice.
  unpairingIndex: number | null = null;
  // The last attempt did not go through. Cleared when the next one starts, and when the
  // dialog that said so is closed: see forgetDialogFailures.
  hasUnpairFailed = false;
  // The fabric being labelled right now, so its dialog can say so and cannot be used twice.
  labellingIndex: number | null = null;
  // Kept apart from hasUnpairFailed rather than shared: the two have separate dialogs
  // open at separate times, and one flag would show a failed label inside the unpair
  // dialog of the next fabric the operator opens.
  hasLabelFailed = false;
  // The fabric whose link the bridge is checking right now.
  checkingIndex: number | null = null;
  // The fabric whose last check did not go through: its details say so, and no other's.
  failedCheckIndex: number | null = null;
  // The window is being opened or closed right now, so the button cannot be pressed
  // twice and says it is busy.
  isChangingWindow = false;
  // The bridge refused to open or close the window, or did not answer. 409 lands here
  // too: an app is pairing at this very moment, or the bridge is making its Matter side
  // anew after the last app left - and the page says so rather than pretending.
  hasWindowFailed = false;
  // The code was not changed. Apart from hasWindowFailed: that one is said under the
  // button that adds a fabric, this one in the dialog of the code.
  hasCodeFailed = false;
  // A window was asked for and the bridge has not answered: after the last fabric is
  // removed that takes a few seconds, and a spinner alone read as a page that hung.
  isOpeningWindow = false;
  // The reset of the bridge is on its way, and whether it went through: said in its dialog.
  isResetting = false;
  hasResetFailed = false;
  // The last window ran out of time and nobody was added. Kept until the next window
  // opens, because without it the code simply vanishes from the page and the person
  // who went to fetch a phone cannot tell a timeout from a fault.
  hasWindowExpired = false;
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
  // When the pairing block last seen closes, on the clock of the controller. Kept apart
  // from the status: the code is dropped from it at that time, and the next answer still
  // has to tell a block that ran out from one that was closed.
  #openUntil: number | null = null;

  // A tab that comes back shows the state of now, not the state of when it was hidden -
  // and not for a moment a code whose time ran out meanwhile.
  // A field and not a method, because addEventListener and removeEventListener have to
  // be given one and the same function.
  readonly #onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      runInAction(() => this.#forgetCodeIfOver());
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
        if (Number.isFinite(status?.now)) {
          this.clockOffset = status.now - Date.now();
        }
        this.#noteWindowEnd(status);
        this.#openUntil = status?.pairing?.closes_at ?? null;
        this.status = status;
        this.isUnreachable = false;
        this.silentFor = 0;
        this.#silentSince = null;
        this.isLoading = false;
      });
    } catch {
      if (asked < this.#shown) {
        return;
      }
      this.#shown = asked;
      runInAction(() => {
        // The last known state is kept on purpose: a page that empties itself on one
        // failed request is worse than a page with a warning over the data. All but the
        // pairing code, once its time is over: nothing says the block is still open.
        this.#forgetCodeIfOver();
        this.isUnreachable = true;
        this.#silentSince ??= Date.now();
        this.silentFor = Date.now() - this.#silentSince;
        this.isLoading = false;
      });
    }
  }

  /**
   * The bridge does not answer, and has not for so short a time that it is most likely
   * starting: the service was restarted, or its package updated.
   */
  get isStarting() {
    return this.isUnreachable && this.silentFor < STARTING_MS;
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
   * Drops a fabric and opens the way in again at once: what an advice of the bridge calls
   * reconnecting. A bridge left with no fabric makes its node anew and waits for that
   * itself before it opens.
   */
  async reconnect(index: number) {
    return await this.unpair(index) && this.openWindow();
  }

  /**
   * Has the bridge reset. As with unpair, what /status says afterwards is the truth and
   * not what this call returned: the fabrics are gone when the list is empty.
   */
  async resetBridge() {
    this.isResetting = true;
    this.hasResetFailed = false;
    let ok = true;
    try {
      await resetMatterBridge();
    } catch {
      ok = false;
    }
    await this.fetch();
    runInAction(() => {
      this.isResetting = false;
      this.hasResetFailed = !ok;
    });
    return ok;
  }

  /** Has the bridge check the link to one fabric; what came of it is read from /status. */
  async checkLink(index: number) {
    this.checkingIndex = index;
    this.failedCheckIndex = null;
    let ok = true;
    try {
      await checkFabricLink(index);
    } catch {
      ok = false;
    }
    await this.fetch();
    runInAction(() => {
      this.checkingIndex = null;
      this.failedCheckIndex = ok ? null : index;
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
    this.isOpeningWindow = true;
    const ok = await this.#changeWindow(openMatterWindow);
    runInAction(() => {
      this.isOpeningWindow = false;
    });
    return ok;
  }

  /** Closes it before its time. */
  async closeWindow() {
    return this.#changeWindow(closeMatterWindow);
  }

  /**
   * Replaces the pairing code of this controller.
   *
   * Shares isChangingWindow with the two above on purpose: from the page's side it is one
   * request to the bridge about the code and one busy state. The failure is its own: it
   * is said in the dialog of the code, not under the button that adds a fabric.
   */
  async changeCode() {
    return this.#changeWindow(changeMatterCode, 'hasCodeFailed');
  }

  /**
   * A dialog was closed: what it said of its last attempt is not for the next fabric the
   * operator opens it on, nor for the next time it is opened.
   */
  forgetDialogFailures() {
    this.hasUnpairFailed = false;
    this.hasLabelFailed = false;
    this.hasCodeFailed = false;
    this.hasResetFailed = false;
  }

  /** Reads the state now and keeps it up to date while the tab is visible. */
  startWatching() {
    // The store is a singleton and the page mounts twice under StrictMode, so a second
    // start without a stop would leave the first timer running forever.
    this.stopWatching();
    // A page opened anew starts clean: "time is up" is for the person who was here when
    // it ran out, not for whoever comes back the next day.
    this.hasWindowExpired = false;
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
    // Nobody is looking at the page now, and the pairing code is a credential: it is not
    // kept for whoever opens the page next. An answer still on its way would put it back,
    // so it is dropped as well.
    this.#asked += 1;
    this.#shown = this.#asked;
    this.#openUntil = null;
    this.#forgetCode();
  }

  /**
   * Tells a window that ran out from one that was closed. A window ends before its time
   * when a fabric is added or somebody closes it, and at its time when nobody came - the
   * clock of the controller is the one that says which, since closes_at is on it. The
   * slack is for the poll that lands a moment before the bridge closes the window.
   */
  #noteWindowEnd(next: MatterStatus) {
    if (!next || !this.status) {
      return;
    }
    if (next.pairing || next.fabrics.length > this.status.fabrics.length) {
      this.hasWindowExpired = false;
      return;
    }
    if (this.#openUntil !== null) {
      this.hasWindowExpired = Date.now() + this.clockOffset >= this.#openUntil - WINDOW_END_SLACK_MS;
    }
  }

  /** Drops the pairing code from the state that is kept; the rest of it stays. */
  #forgetCode() {
    if (this.status?.pairing) {
      this.status = { ...this.status, pairing: null };
    }
  }

  /** The same once the block has run out of time, by the clock of the controller. */
  #forgetCodeIfOver() {
    if (this.#openUntil !== null && Date.now() + this.clockOffset >= this.#openUntil) {
      this.#forgetCode();
    }
  }

  async #changeWindow(
    call: () => Promise<MatterWindow>,
    failure: 'hasWindowFailed' | 'hasCodeFailed' = 'hasWindowFailed',
  ) {
    this.isChangingWindow = true;
    this[failure] = false;
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
      this[failure] = !ok;
    });
    return ok;
  }
}
