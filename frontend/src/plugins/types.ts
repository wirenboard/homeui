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
  label: string;
  onClick: () => void;
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
    readonly rule: { name: string; content: string; error: { message: string; errorLine?: number } | null };
  };
  devices: () => DeviceSnapshot[];
  ruleLogs: (_count: number) => { level: string; payload: string }[];
  language: () => string;
}

export interface PluginDefinition {
  id: string;
  activate: (_api: PluginApi) => void;
}
