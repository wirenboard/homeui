import { makeAutoObservable, runInAction } from 'mobx';
import { editorProxy, mqttClient } from '@/services';
import { generateNextId } from '@/utils/id';
import {
  locationBelongsToRule, recordRuntimeErrorIn, restoreRuntimeErrorsIn,
} from './autocomplete/runtime-error-parse';
import type { Rule, RuleError, RuleLevel, RuleListItem, RuleLog, RuleRuntimeError, TsCheckDiag } from './types';

// How long before a /wbrules/updates/changed notification an error may
// have arrived and still describe the version being (re)loaded: the engine
// runs the new file first and publishes "changed" right after it on the
// same ordered MQTT connection, so the two arrive back to back.
const RELOAD_LOG_GRACE_MS = 1000;

export default class RulesStore {
  public rule?: Rule = {
    name: '',
    enabled: true,
    initName: '',
  };
  public rules: RuleListItem[] = [];
  public isRuleDebugEnabled = false;
  public logs: RuleLog[] = [];
  public logLevelFilter = 'all';
  public tsCheckDiags: TsCheckDiag[] = [];
  public tsCheckedContent: string | null = null;
  // the open rule's content as it runs on the controller (loaded, or last
  // saved); runtime errors are anchored to this version
  public runningContent: string | null = null;
  public runtimeErrors: RuleRuntimeError[] = [];
  // in-flight Save count per rule path (see save / the "changed"
  // subscription); a counter, not a set: overlapping saves of the same
  // path must keep the changed-clear suppressed until the LAST one ends
  private _saving = new Map<string, number>();
  private _tsCheckToken = 0;
  private _runningContentEpoch = 0;

  constructor() {
    makeAutoObservable(this);
  }

  setLogLevelFilter(value: string) {
    this.logLevelFilter = value;
  }

  async load(path: string): Promise<Rule> {
    return mqttClient.whenConnected()
      .then(() => editorProxy.Load({ path }))
      .then((res) => {
        runInAction(() => {
          this.rule = {
            initName: path,
            name: path,
            enabled: res.enabled,
            content: res.content,
          };
          this.setRunningContent(res.content ?? null);
          if (res.error) {
            this.setError(res.error);
          }
        });

        return this.rule;
      });
  }

  setRule(value: string) {
    this.rule.content = value;
    if (this.rule.error) {
      this.rule.error.errorLine = null;
    }
  }

  setRuleName(value: string) {
    this.rule.name = value;
  }

  setRuleError(error: string) {
    this.rule.error = {
      message: error,
    };
  }

  resetRule() {
    this.rule = {
      name: '',
      initName: '',
      content: '',
      enabled: true,
      error: null,
    };
    this.setRunningContent(null);
  }

  async save(rule: Rule): Promise<string> {
    let path = rule.initName;
    if (!path) {
      path = this.getValidRuleName(rule.name);
    }
    // The engine runs the saved file before it replies (and before it
    // publishes /wbrules/updates/changed), and an error logged during that
    // run - a rejected write at top level - arrives BEFORE both; clearing
    // on either would wipe it. So: clear the previous version's errors now,
    // remember that this path is being saved so the coming "changed" does
    // not clear again, and keep what arrives from here on.
    const savedContent = rule.content ?? null;
    // remember what is cleared: a save that FAILS never reached the engine,
    // so the previous version keeps running and its errors still describe it
    const cleared = this.runtimeErrors.filter((e) => locationBelongsToRule(e, path));
    runInAction(() => {
      this.clearRuntimeErrorsFor(path);
      this._saving.set(path, (this._saving.get(path) ?? 0) + 1);
    });

    return editorProxy.Save({ path, content: rule.content })
      .then(async (res) => {
        runInAction(() => {
          if (res.error) {
            this.setError({
              message: res.error,
              traceback: res.traceback,
            });
          } else {
            rule.error = null;
          }
          // the content handed to the engine is what runs now (the user
          // may have typed on while the reply was in flight)
          this.setRunningContent(savedContent);
        });
        return res.path;
      })
      .catch((err) => {
        runInAction(() => restoreRuntimeErrorsIn(this.runtimeErrors, cleared));
        throw err;
      })
      .finally(() => {
        // the "changed" for this save has arrived by the time the engine
        // replies (same ordered MQTT client)
        runInAction(() => {
          const left = (this._saving.get(path) ?? 1) - 1;
          if (left > 0) this._saving.set(path, left);
          else this._saving.delete(path);
        });
      });
  }

  async rename(oldName: string, newName: string): Promise<string> {
    // an extensionless new title keeps the file's language: renaming
    // foo.ts to "bar" must not silently turn it into bar.js
    const extension = oldName.endsWith('.ts') ? '.ts' : '.js';
    return editorProxy.Rename({ path: oldName, new_path: this.getValidRuleName(newName, extension) })
      .then(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return this.getValidRuleName(newName, extension);
      });
  }

  async checkIsNameUnique(name: string): Promise<boolean> {
    // test the same path the upcoming save/rename will target: a rename
    // keeps the old file's extension, a fresh save defaults to .js
    const extension = this.rule?.initName?.endsWith('.ts') ? '.ts' : '.js';
    const path = this.getValidRuleName(name, extension);
    const list = await this.getList();
    if (list.some((rule) => rule.virtualPath === path)) {
      throw new Error('file-exists');
    }

    return true;
  }

  getValidRuleName(path: string, defaultExtension = '.js'): string {
    return path.endsWith('.js') || path.endsWith('.ts') ? path : `${path}${defaultExtension}`;
  }

  async changeState(path: string, state: boolean): Promise<void> {
    await editorProxy.ChangeState({ path, state });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await this.getList();
  }

  async getList(): Promise<RuleListItem[]> {
    return mqttClient.whenConnected()
      .then(() => editorProxy.List())
      .then((rules) => {
        return runInAction(() => {
          this.rules = rules;
          return this.rules;
        });
      });
  }

  async copyRule(path: string) {
    const copiedRule = await this.load(path);
    const extension = copiedRule.name.endsWith('.ts') ? '.ts' : '.js';
    copiedRule.name = generateNextId(
      this.rules.map((rule) => rule.virtualPath.replace(/\.(js|ts)$/, '')),
      copiedRule.name.replace(/\.(js|ts)$/, ''),
    );
    const copiedRuleName = await this.save({
      ...copiedRule,
      initName: this.getValidRuleName(copiedRule.name + extension),
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await this.changeState(copiedRuleName, false);
  }

  async deleteRule(path: string) {
    return editorProxy.Remove({ path }).then((res) => {
      if (res) {
        runInAction(() => {
          this.rules = this.rules.filter((rule) => rule.virtualPath !== path);
        });
      }
    });
  }

  setError(error: RuleError) {
    this.rule.error = {
      message: error?.message || '',
    };

    this.rule.error.errorLine = error?.traceback?.length ? error?.traceback[0].line : null;
  }

  subscribeRuleDebugging() {
    mqttClient.addStickySubscription('/devices/wbrules/controls/Rule debugging', ({ payload }) => {
      runInAction(() => {
        this.isRuleDebugEnabled = payload === '1';
      });
    });
  }

  toggleRuleDebugging() {
    runInAction(() => {
      const value = !this.isRuleDebugEnabled;
      mqttClient.send('/devices/wbrules/controls/Rule debugging/on', String(Number(value)), false, 1);
      this.isRuleDebugEnabled = value;
    });
  }

  subscribeRulesLogs() {
    const MAX_MESSAGES = 500;
    mqttClient.addStickySubscription('/wbrules/log/+', ({ topic, payload }) => {
      runInAction(() => {
        if (this.logs.length === MAX_MESSAGES) {
          this.logs.shift();
        }
        const level = topic.replace(/^.*\//, '') as RuleLevel;
        const text = payload.trim();
        this.logs.push({
          level,
          payload: text,
          time: new Date().getTime(),
        });
        if (level === 'error') {
          this.recordRuntimeError(text);
        }
      });
    });
    // The engine (re)loaded a file. A save from this store owns the error
    // lifecycle itself (cleared on save start, suppressed here). Otherwise
    // the reload is external (scp, another tab, an engine restart): the
    // previous version's errors are obsolete - but errors that arrived just
    // before the notification were logged WHILE the new version loaded
    // (see RELOAD_LOG_GRACE_MS) and must survive the clear.
    mqttClient.addStickySubscription('/wbrules/updates/changed', ({ payload }) => {
      const changed = payload.trim();
      if (this._saving.has(changed)) return;
      runInAction(() => this.clearRuntimeErrorsFor(changed, Date.now() - RELOAD_LOG_GRACE_MS));
      this.refreshRunningContent(changed);
    });
  }

  // keep an error-level console message as a per-line runtime error when
  // the engine attributed it to a rule file (attribution, dedupe and
  // bounding policy live in runtime-error-parse.ts)
  recordRuntimeError(payload: string, now = Date.now()) {
    recordRuntimeErrorIn(this.runtimeErrors, payload, now);
  }

  runtimeErrorsFor(virtualPath: string): RuleRuntimeError[] {
    return this.runtimeErrors.filter((e) => locationBelongsToRule(e, virtualPath));
  }

  // clears the errors recorded for a rule file; with keepSince, entries
  // that arrived at or after that time survive (they describe the version
  // an external reload just loaded, not the one it replaced)
  clearRuntimeErrorsFor(virtualPath: string, keepSince?: number) {
    if (!virtualPath) return;
    this.runtimeErrors = this.runtimeErrors.filter(
      (e) => !locationBelongsToRule(e, virtualPath)
        || (keepSince !== undefined && e.lastSeen >= keepSince),
    );
  }

  unSubscribeRulesLogs() {
    mqttClient.unsubscribe('/wbrules/log/+');
    mqttClient.unsubscribe('/wbrules/updates/changed');
  }

  // The controller re-checks .ts rules with the same tsgo it runs them
  // with (Editor.Check RPC) - the authoritative verdict, pulled on file
  // open and after each save, shown next to the editor's own live check.
  async checkTsFile(fileName: string, contentOverride?: string) {
    // the verdict describes the saved file; capture the matching editor
    // content so stale diagnostics are suppressed once the user edits
    // (callers pass the exact content they saved when they have it)
    const checkedContent = contentOverride ?? this.rule?.content ?? '';
    this._tsCheckToken += 1;
    const token = this._tsCheckToken;
    try {
      // old firmware has no Editor.Check: the retained method advertisement
      // answers that once (cached afterwards) instead of an RPC dangling for
      // its full timeout on every open and save
      if (!(await editorProxy.hasMethod('Check'))) {
        if (token === this._tsCheckToken) runInAction(() => this.clearTsCheck());
        return;
      }
      // the controller answers 'pending' while its background check for a
      // freshly loaded/saved file is still running. Right after a restart
      // that check covers every rule file at once and can take a while on a
      // slow controller, so poll for about a minute, backing off; a newer
      // check or leaving the page cancels this one
      for (let attempt = 0; attempt < 40; attempt++) {
        const result = await editorProxy.Check({ path: fileName });
        if (token !== this._tsCheckToken) return; // superseded by a newer check
        if (result?.status !== 'pending') {
          runInAction(() => {
            this.tsCheckDiags = result?.status === 'ready' ? result.diags ?? [] : [];
            this.tsCheckedContent = checkedContent;
          });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, Math.min(2000, 700 + attempt * 100)));
      }
      if (token !== this._tsCheckToken) return; // a newer check owns the state
      runInAction(() => this.clearTsCheck());
    } catch {
      if (token !== this._tsCheckToken) return;
      runInAction(() => this.clearTsCheck());
    }
  }

  clearTsCheck() {
    this._tsCheckToken += 1; // cancels any in-flight poll loop
    this.tsCheckDiags = [];
    this.tsCheckedContent = null;
  }

  clearLogs() {
    this.logs = [];
  }

  // The open rule was reloaded outside this store (scp, another tab):
  // re-fetch the content runtime errors anchor to so it describes what
  // runs NOW. Only runningContent is refreshed, never the editing buffer.
  private refreshRunningContent(virtualPath: string) {
    if (!virtualPath || this.rule?.initName !== virtualPath) return;
    const epoch = ++this._runningContentEpoch;
    editorProxy.Load({ path: virtualPath })
      // content unknown on failure: no inline anchors beats wrong ones
      .then((res) => res.content ?? null, () => null)
      .then((content) => {
        if (epoch !== this._runningContentEpoch || this.rule?.initName !== virtualPath) return;
        runInAction(() => this.setRunningContent(content));
      });
  }

  // every runningContent write goes through here: bumping the epoch drops
  // any in-flight refreshRunningContent reply that would otherwise clobber
  // a fresher value (a save reply, a navigation load, a newer refresh)
  private setRunningContent(content: string | null) {
    this._runningContentEpoch++;
    this.runningContent = content;
  }
}
