import { linter, type Diagnostic as CmDiagnostic, type LintSource } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import type { VirtualTypeScriptEnvironment } from '@typescript/vfs';
import type { Diagnostic } from 'typescript';
import type { TsModule } from './types';

// The editor's TypeScript diagnostics as a CodeMirror lint source.
//
// This replaces valtown's tsLinter(): that one shows only the head of a
// chained TypeScript message ("Type 'typeof controls' is not assignable to
// type 'ControlsSpec'.") and drops the part that explains it ("Property
// 'type' is 'string', not 'rgb'"); the chain is what makes the tooltip, the
// lens and the problems panel actionable. The language service's
// getSemanticDiagnostics is the wrapped one (advisory .js policy, forgot-await
// checks), so those come through here too.
export function tsDiagnosticsLinter(
  tsm: TsModule,
  env: VirtualTypeScriptEnvironment,
  path: string,
): Extension {
  return linter(tsDiagnosticsSource(tsm, env, path));
}

// the lint source behind tsDiagnosticsLinter (exported for tests)
export function tsDiagnosticsSource(
  tsm: TsModule,
  env: VirtualTypeScriptEnvironment,
  path: string,
): LintSource {
  return (view) => {
    if (!env.getSourceFile(path)) return [];
    const docLength = view.state.doc.length;
    const out: CmDiagnostic[] = [];
    for (const d of [
      ...env.languageService.getSyntacticDiagnostics(path),
      ...env.languageService.getSemanticDiagnostics(path),
    ]) {
      if (d.start === undefined || d.length === undefined) continue;
      out.push({
        from: Math.min(d.start, docLength),
        to: Math.min(d.start + d.length, docLength),
        severity: tsSeverity(tsm, d),
        source: 'typescript',
        message: tsm.flattenDiagnosticMessageText(d.messageText, '\n'),
      });
    }
    return out;
  };
}

// TypeScript categories onto CodeMirror severities (the mapping valtown
// uses; unreachable code TS7027 is a warning, not an error)
export function tsSeverity(tsm: TsModule, d: Diagnostic): CmDiagnostic['severity'] {
  if (d.code === 7027) return 'warning';
  switch (d.category) {
    case tsm.DiagnosticCategory.Error: return 'error';
    case tsm.DiagnosticCategory.Warning: return 'warning';
    default: return 'info';
  }
}
