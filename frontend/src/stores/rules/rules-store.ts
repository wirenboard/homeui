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
  #whenMqttReady: any;

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
    const path = rule.name.endsWith('.js') ? rule.name : `/${rule.name}.js`;
    // check that file is not exists
    if (rule.initName !== path) {
      const list = await this.getList();
      if (list.some((rule) => rule.virtualPath === path)) {
        throw new Error('file-exists');
      }
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

  async changeState(path: string, state: boolean) {
    const isChanged = await this.#editorProxy.ChangeState({ path, state });
    runInAction(() => {
      this.rules = this.rules.map((rule) => {
        if (rule.virtualPath === path) {
          rule.enabled = isChanged ? !rule.enabled : rule.enabled;
        }
        return rule;
      });
    });
  }

  async getList(): Promise<RuleListItem[]> {
    const rules = await this.#editorProxy.List();
    runInAction(() => {
      this.rules = rules;
    });
    return this.rules;
  }

  async copyRule(path: string) {
    const copiedRule = await this.load(path);
    copiedRule.name = generateNextId(
      this.rules.map((rule) => rule.virtualPath.replace(/\.js$/, '')),
      copiedRule.name.replace(/\.js$/, '')
    );
    await this.save(copiedRule);
    await this.getList();
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
