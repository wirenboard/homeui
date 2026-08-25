import type { CompletionSource } from '@codemirror/autocomplete';
import { StateField } from '@codemirror/state';
import { showTooltip, type Tooltip } from '@codemirror/view';
import type { LanguageService, SymbolDisplayPart } from 'typescript';
import type { TsModule } from './types';

// @valtown/codemirror-ts builds completion entries as { label, type, boost }
// only - it never fetches getCompletionEntryDetails, so the popup shows just
// the name, and it wires no signature help at all. Both are added here from
// the same language service, so the JSDoc in wb-rules.d.ts (e.g. on
// device.writeChannel) reaches the editor.

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

// Wraps a completion source so every entry gains `detail` (the signature)
// and `info` (a panel with the signature and the JSDoc), fetched lazily per
// entry via getCompletionEntryDetails - so highlighting an entry shows its
// help instead of just the name.
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
        if (option.info || option.detail) return option;
        const label = String(option.label);
        const details = () =>
          env.languageService.getCompletionEntryDetails(path, pos, label, {}, undefined, undefined, undefined);
        return {
          ...option,
          // a short one-line signature shown next to the label
          detail: (() => {
            const d = details();
            const sig = partsToString(ts, d?.displayParts);
            return sig ? sig.replace(/\s+/g, ' ') : undefined;
          })(),
          // the full panel: signature + documentation + tags (@param, ...)
          info: () => {
            const d = details();
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

// Builds the parameter-hint tooltip for the call the cursor is inside, with
// the active parameter emphasised, from getSignatureHelpItems.
export function buildSignatureTooltip(env: TsEnv, path: string, ts: TsModule, pos: number): Tooltip | null {
  const help = env.languageService.getSignatureHelpItems(path, pos, {});
  if (!help || help.items.length === 0) return null;
  const item = help.items[help.selectedItemIndex] ?? help.items[0];
  const activeParam = help.argumentIndex;

  return {
    pos: help.applicableSpan.start,
    above: true,
    create: () => {
      const dom = div('cm-signatureHelp');
      const sig = div('cm-signatureHelp-signature');
      sig.appendChild(document.createTextNode(partsToString(ts, item.prefixDisplayParts)));
      const separator = partsToString(ts, item.separatorDisplayParts) || ', ';
      item.parameters.forEach((param, i) => {
        if (i > 0) sig.appendChild(document.createTextNode(separator));
        const text = partsToString(ts, param.displayParts);
        if (i === activeParam) {
          const active = document.createElement('span');
          active.className = 'cm-signatureHelp-active';
          active.textContent = text;
          sig.appendChild(active);
        } else {
          sig.appendChild(document.createTextNode(text));
        }
      });
      sig.appendChild(document.createTextNode(partsToString(ts, item.suffixDisplayParts)));
      dom.appendChild(sig);

      const doc = partsToString(ts, item.documentation);
      if (doc) dom.appendChild(div('cm-signatureHelp-doc', doc));
      const activeDoc = partsToString(ts, item.parameters[activeParam]?.documentation);
      if (activeDoc) dom.appendChild(div('cm-signatureHelp-param-doc', activeDoc));
      return { dom };
    },
  };
}

// A StateField that shows the signature-help tooltip whenever the cursor is
// inside a call's arguments (recomputed on edits and cursor moves).
export function signatureHelp(env: TsEnv, path: string, ts: TsModule) {
  const tooltipOf = (headPos: number): Tooltip | null => buildSignatureTooltip(env, path, ts, headPos);
  return StateField.define<Tooltip | null>({
    create: (state) => tooltipOf(state.selection.main.head),
    update: (value, tr) => {
      if (!tr.docChanged && !tr.selection) return value;
      return tooltipOf(tr.state.selection.main.head);
    },
    provide: (field) => showTooltip.from(field),
  });
}
