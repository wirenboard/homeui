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

// a runtime error from the rule console that the engine attributed to a
// line of a rule file (see autocomplete/runtime-errors.ts); repeats of the
// same error at the same place are counted, not duplicated
export interface RuleRuntimeError {
  path: string; // physical path as reported by the engine
  line: number;
  message: string; // first line of the console message
  count: number;
  lastSeen: number;
}

// one diagnostic from the editor's local TypeScript language service,
// used to de-duplicate the controller's findings
export interface LocalTsDiag {
  line: number;
  message: string;
}

export type TsCheckStatus = 'ready' | 'pending' | 'not-ts' | 'unsupported';

// reply of the Editor.Check RPC: the controller-side tsgo verdict;
// diags are valid only for 'ready', poll again on 'pending'
export interface TsCheckResult {
  status: TsCheckStatus;
  diags: TsCheckDiag[];
}

// one diagnostic from the controller-side tsgo check (Editor.Check RPC)
export interface TsCheckDiag {
  // set only for diagnostics from another file (import/reference);
  // such entries must not be anchored in the checked file
  file?: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  message: string;
  // TypeScript diagnostic code (the NNNN of TSNNNN); absent for a transpile
  // failure the engine reports without one
  code?: number;
}
