import { makeAutoObservable, runInAction } from 'mobx';
import { generateNextId } from '@/utils/id';
import { Rule, RuleError, RuleFetchData, RuleListItem, RuleSaveData } from './types';

export default class RulesStore {
  public rule?: Rule = {
    name: '',
    initName: '',
  };
  public rules: RuleListItem[] = [];

  #editorProxy: any;
  #whenMqttReady: () => Promise<void>;

  // eslint-disable-next-line typescript/naming-convention
  constructor(whenMqttReady: () => Promise<void>, EditorProxy: any) {
    this.#editorProxy = EditorProxy;
    this.#whenMqttReady = whenMqttReady;

    makeAutoObservable(this);
  }

  async load(path: string): Promise<Rule> {
    return this.#whenMqttReady()
      .then(() => this.#editorProxy.Load({ path }))
      .then((res: RuleFetchData) => {
        runInAction(() => {
          this.rule = {
            initName: path,
            name: path,
            content: res.content,
          };
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

  async save(rule: Rule): Promise<string> {
    let path = rule.initName;
    if (!path) {
      path = this.getValidRuleName(rule.name);
    }

    return this.#editorProxy.Save({ path, content: rule.content })
      .then(async (res: RuleSaveData) => {
        runInAction(() => {
          if (res.error) {
            this.setError({
              message: res.error,
              traceback: res.traceback,
            });
          } else {
            rule.error = null;
          }
        });
        return res.path;
      });
  }

  async rename(oldName: string, newName: string): Promise<string> {
    return this.#editorProxy.Rename({ path: oldName, new_path: this.getValidRuleName(newName) })
      .then(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return this.getValidRuleName(newName);
      });
  }

  async checkIsNameUnique(name: string): Promise<boolean> {
    const path = this.getValidRuleName(name);
    const list = await this.getList();
    if (list.some((rule) => rule.virtualPath === path)) {
      throw new Error('file-exists');
    }

    return true;
  }

  getValidRuleName(path: string): string {
    return path.endsWith('.js') ? path : `${path}.js`;
  }

  async changeState(path: string, state: boolean): Promise<void> {
    await this.#editorProxy.ChangeState({ path, state });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await this.getList();
  }

  async getList(): Promise<RuleListItem[]> {
    return this.#whenMqttReady()
      .then(() => this.#editorProxy.List())
      .then((rules: RuleListItem[]) => {
        return runInAction(() => {
          this.rules = rules;
          return this.rules;
        });
      });
  }

  async copyRule(path: string) {
    const copiedRule = await this.load(path);
    copiedRule.name = generateNextId(
      this.rules.map((rule) => rule.virtualPath.replace(/\.js$/, '')),
      copiedRule.name.replace(/\.js$/, '')
    );
    const copiedRuleName = await this.save({ ...copiedRule, initName: this.getValidRuleName(copiedRule.name) });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await this.changeState(copiedRuleName, false);
  }

  async deleteRule(path: string) {
    return this.#editorProxy.Remove({ path }).then((res: boolean) => {
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
}
