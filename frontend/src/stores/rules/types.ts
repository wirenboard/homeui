interface RuleTemplateData {
  line: number;
  name: string;
}

export interface RuleError {
  message: string;
  traceback?: RuleTemplateData[];
}

export interface RuleListItem {
  virtualPath: string;
  enabled: boolean;
  error?: RuleError;
  rules: RuleTemplateData[];
  devices: RuleTemplateData[];
  timers: RuleTemplateData[];
}

export interface RuleFetchData {
  content?: string;
  error?: RuleError;
}

export interface RuleSaveData {
  path: string;
  error?: string;
  traceback?: RuleTemplateData[];
}

export interface Rule extends RuleFetchData {
  name: string;
  initName: string;
  content?: string;
  error?: RuleError & {
    errorLine?: number | null;
  };
}
