interface ErrorTraceback {
  line: number;
  name: string;
}

export interface RuleError {
  message: string;
  traceback?: ErrorTraceback[];
}

export interface RuleListItem {
  virtualPath: string;
  enabled: boolean;
  error?: RuleError;
}

export interface RuleFetchData {
  content?: string;
  error?: RuleError;
}

export interface RuleSaveData {
  path: string;
  error?: string;
  traceback?: ErrorTraceback[];
}

export interface Rule extends RuleFetchData {
  name: string;
  initName: string;
  content?: string;
  error?: RuleError & {
    errorLine?: number | null;
  };
}
