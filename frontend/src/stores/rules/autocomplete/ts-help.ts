import type { CompletionSource } from '@codemirror/autocomplete';
import type { LanguageService, SymbolDisplayPart } from 'typescript';
import type { TsModule } from './types';

// @valtown/codemirror-ts builds completion entries as { label, type, boost }
// only - it never fetches getCompletionEntryDetails, so the popup shows just
// the name. The signature and JSDoc are added here from the same language
// service, so the docs in wb-rules.d.ts (e.g. on device.writeChannel) reach
// the completion panel. (Parameter hints on '(' are intentionally left to
// the completion panel / hover, to avoid a second tooltip overlapping the
// autocomplete popup.)

interface TsEnv {
  languageService: LanguageService;
}

const partsToString = (ts: TsModule, parts?: readonly SymbolDisplayPart[]): string =>
  parts ? ts.displayPartsToString([...parts]) : '';

const div = (className: string, text?: string): HTMLDivElement => {
  const el = document.createElement('div');
  el.className = className;
  if (text) el.textContent = text;
  return el;
};

// Wraps a completion source so every entry gains an `info` panel with its
// signature, JSDoc and @tags. The details are fetched lazily, only for the
// entry the user highlights (getCompletionEntryDetails is not cheap, so
// computing it for the whole list on every keystroke would lag the popup).
export function withCompletionDetails(
  base: CompletionSource,
  env: TsEnv,
  path: string,
  ts: TsModule,
): CompletionSource {
  return async (context) => {
    const result = await base(context);
    if (!result) return result;
    const pos = context.pos;
    return {
      ...result,
      options: result.options.map((option) => {
        if (option.info) return option;
        const label = String(option.label);
        return {
          ...option,
          info: () => {
            const d = env.languageService.getCompletionEntryDetails(
              path, pos, label, {}, undefined, undefined, undefined,
            );
            if (!d) return null;
            const dom = div('cm-completionInfo-ts');
            const sig = partsToString(ts, d.displayParts);
            if (sig) dom.appendChild(div('cm-completionInfo-signature', sig));
            const doc = partsToString(ts, d.documentation);
            if (doc) dom.appendChild(div('cm-completionInfo-doc', doc));
            (d.tags ?? []).forEach((tag) => {
              const text = partsToString(ts, tag.text);
              dom.appendChild(div('cm-completionInfo-tag', text ? `@${tag.name} ${text}` : `@${tag.name}`));
            });
            return dom.childNodes.length ? dom : null;
          },
        };
      }),
    };
  };
}
