import { makeAutoObservable, runInAction } from 'mobx';
import { editorProxy, mqttClient } from '@/services';
import { generateNextId } from '@/utils/id';
import {
  locationBelongsToRule, recordRuntimeErrorIn, restoreRuntimeErrorsIn,
} from './autocomplete/runtime-error-parse';
import { RULE_FILE_EXTENSION_RX, ruleFileExtension } from './rule-file-extension';
import type { Rule, RuleError, RuleLevel, RuleListItem, RuleLog, RuleRuntimeError, TsCheckDiag } from './types';

// the engine runs a (re)loaded file first and publishes /wbrules/updates/changed right
// after it on the same ordered MQTT connection, so a load-time error arrives just before
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
  // the open rule's content as it runs on the controller; runtime errors anchor to it
  public runningContent: string | null = null;
  public runtimeErrors: RuleRuntimeError[] = [];
  // in-flight saves per path; a counter, not a set: overlapping saves must keep
  // the "changed" clear suppressed until the last one ends
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
    // the engine runs the saved file before it replies and before "changed", so an
    // error of the new version can arrive before both: clear the old errors now
    const savedContent = rule.content ?? null;
    // stashed for a failed save: the old version keeps running and its errors still apply
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
          // what runs now is what was sent, not the buffer (the user may have typed on)
          this.setRunningContent(savedContent);
        });
        return res.path;
      })
      .catch((err) => {
        runInAction(() => restoreRuntimeErrorsIn(this.runtimeErrors, cleared));
        throw err;
      })
      .finally(() => {
        // the "changed" for this save has arrived by the time the engine replies
        runInAction(() => {
          const left = (this._saving.get(path) ?? 1) - 1;
          if (left > 0) this._saving.set(path, left);
          else this._saving.delete(path);
        });
      });
  }

  async rename(oldName: string, newName: string): Promise<string> {
    // an extensionless new title keeps the file's language (foo.ts -> "bar" is not bar.js)
    const extension = ruleFileExtension(oldName);
    return editorProxy.Rename({ path: oldName, new_path: this.getValidRuleName(newName, extension) })
      .then(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return this.getValidRuleName(newName, extension);
      });
  }

  async checkIsNameUnique(name: string): Promise<boolean> {
    const extension = ruleFileExtension(this.rule?.initName ?? '');
    const path = this.getValidRuleName(name, extension);
    const list = await this.getList();
    if (list.some((rule) => rule.virtualPath === path)) {
      throw new Error('file-exists');
    }

    return true;
  }

  getValidRuleName(path: string, defaultExtension = '.js'): string {
    return RULE_FILE_EXTENSION_RX.test(path) ? path : `${path}${defaultExtension}`;
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
    const extension = ruleFileExtension(copiedRule.name);
    copiedRule.name = generateNextId(
      this.rules.map((rule) => rule.virtualPath.replace(RULE_FILE_EXTENSION_RX, '')),
      copiedRule.name.replace(RULE_FILE_EXTENSION_RX, ''),
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
    // a save from this store owns its error lifecycle (cleared on save start). An
    // external reload (scp, another tab, restart) obsoletes the old errors, except
    // those logged while the new version loaded (see RELOAD_LOG_GRACE_MS)
    mqttClient.addStickySubscription('/wbrules/updates/changed', ({ payload }) => {
      const changed = payload.trim();
      if (this._saving.has(changed)) return;
      runInAction(() => this.clearRuntimeErrorsFor(changed, Date.now() - RELOAD_LOG_GRACE_MS));
      this.refreshRunningContent(changed);
    });
  }

  recordRuntimeError(payload: string, now = Date.now()) {
    recordRuntimeErrorIn(this.runtimeErrors, payload, now);
  }

  runtimeErrorsFor(virtualPath: string): RuleRuntimeError[] {
    return this.runtimeErrors.filter((e) => locationBelongsToRule(e, virtualPath));
  }

  // with keepSince, entries that arrived at or after it survive (they describe the reloaded version)
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

  // the controller's own tsgo verdict (Editor.Check), pulled on open and after each save
  async checkTsFile(fileName: string, contentOverride?: string) {
    // the verdict describes the saved file; keep that content so stale diagnostics hide once the user edits
    const checkedContent = contentOverride ?? this.rule?.content ?? '';
    this._tsCheckToken += 1;
    const token = this._tsCheckToken;
    try {
      // old firmware has no Editor.Check; the retained advertisement answers without a dangling RPC
      if (!(await editorProxy.hasMethod('Check'))) {
        if (token === this._tsCheckToken) runInAction(() => this.clearTsCheck());
        return;
      }
      // 'pending' while the controller's background check is still running; after a
      // restart it covers every rule file at once, so poll for about a minute with backoff
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

  // an external reload of the open rule: re-fetch what runs now; the editing buffer is never touched
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

  // bumping the epoch drops any in-flight refreshRunningContent reply that would
  // clobber a fresher value
  private setRunningContent(content: string | null) {
    this._runningContentEpoch++;
    this.runningContent = content;
  }
}
