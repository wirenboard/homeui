import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { UserRole } from '@/stores/auth';
import type { ConsoleTab } from '@/stores/console-panel';

/** One entry of GET /ui/plugins: a plugin's script and who may load it. */
export interface PluginManifest {
  id: string;
  script: string;
  role?: UserRole;
}

/** A button the plugin adds next to «Save» in the rule editor. */
export interface RuleEditorAction {
  id: string;
  /** A function follows the UI language. */
  label: string | (() => string);
  onClick: () => void;
}

export interface RuleFileError {
  message: string;
  line?: number;
}

export interface DeviceSnapshot {
  id: string;
  title: string;
  controls: { id: string; title: string; type: string; value: unknown; units: string; readonly: boolean }[];
}

/** What a plugin gets in activate(). Bump `version` on breaking changes. */
export interface PluginApi {
  version: 1;
  /** Shared libraries: plugins use these instead of bundling their own copies. */
  libs: Record<string, unknown>;
  consolePanel: {
    registerTab: (_tab: ConsoleTab) => void;
    show: (_tabId?: string) => void;
  };
  ruleEditor: {
    addExtension: (_extension: Extension) => void;
    addAction: (_action: RuleEditorAction) => void;
    /** The open rule editor, or null when no rule is open. */
    readonly view: EditorView | null;
    /** `path` is empty for a rule not saved yet. */
    readonly rule: {
      path: string;
      name: string;
      content: string;
      error: { message: string; errorLine?: number } | null;
    };
    setName: (_name: string) => void;
    /** Press the page's «Save»; resolves with the wb-rules error, if any. */
    save: () => Promise<RuleFileError | null>;
  };
  /** Rule files in /etc/wb-rules, by path relative to it (`light.js`). */
  rules: {
    list: () => Promise<{ path: string; enabled: boolean }[]>;
    load: (_path: string) => Promise<string>;
    save: (_path: string, _content: string) => Promise<RuleFileError | null>;
    remove: (_path: string) => Promise<void>;
    /** Open the file in the rule editor. */
    open: (_path: string) => void;
  };
  devices: () => DeviceSnapshot[];
  ruleLogs: (_count: number) => { level: string; payload: string }[];
  language: () => string;
  /** Called with the new language code when the user switches it. */
  onLanguageChange: (_listener: (_language: string) => void) => void;
}

export interface PluginDefinition {
  id: string;
  activate: (_api: PluginApi) => void;
}
