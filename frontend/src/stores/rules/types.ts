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
  enabled: boolean;
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

export type RuleLevel = 'info' | 'warning' | 'error' | 'debug';

export interface RuleLog {
  level: RuleLevel;
  payload: string;
  time: number;
}

// a console error the engine attributed to a rule line; repeats at the same place are counted
export interface RuleRuntimeError {
  path: string; // physical path as reported by the engine
  line: number;
  message: string; // first line of the console message
  count: number;
  lastSeen: number;
}

export interface LocalTsDiag {
  line: number;
  message: string;
}

export type TsCheckStatus = 'ready' | 'pending' | 'not-ts' | 'unsupported';

// Editor.Check reply; diags are valid only for 'ready', poll again on 'pending'
export interface TsCheckResult {
  status: TsCheckStatus;
  diags: TsCheckDiag[];
}

export interface TsCheckDiag {
  // set for diagnostics from another file; not anchored in the checked file
  file?: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  message: string;
  // the NNNN of TSNNNN; absent for a transpile failure
  code?: number;
}
