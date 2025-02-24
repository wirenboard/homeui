import { EditorState, RangeSet, StateEffect, StateField } from '@codemirror/state';
import { EditorView, gutter, GutterMarker } from '@codemirror/view';

export const breakpointEffect = StateEffect.define<{ pos: number; on: boolean }>();

const breakpointMarker = new class extends GutterMarker {
  toDOM() {
    return document.createTextNode('⚠');
  }
};

export const breakpointState = StateField.define<RangeSet<GutterMarker>>({
  create() {
    return RangeSet.empty;
  },
  update(set, transaction) {
    let updatedSet = set.map(transaction.changes);
    for (let e of transaction.effects) {
      if (e.is(breakpointEffect)) {
        let alreadyExists = false;
        updatedSet.between(e.value.pos, e.value.pos, () => {
          alreadyExists = true;
        });
        if (!alreadyExists && e.value.on) {
          updatedSet = updatedSet.update({ add: [breakpointMarker.range(e.value.pos)] });
        } else if (!e.value.on) {
          updatedSet = updatedSet.update({ filter: (from) => from !== e.value.pos });
        }
      }
    }
    return updatedSet;
  },
});

export const customGutter = gutter({
  class: 'codeEditor-gutters',
  markers: (view) => view.state.field(breakpointState) || RangeSet.empty,
});

export const getGutterEffects = (view: EditorView, state: EditorState, errorLines?: number[]) => {
  const breakpoints = view.state.field(breakpointState, false);
  const output = [];

  (errorLines || []).forEach((lineNumber) => {
    if (lineNumber > state.doc.lines) {
      return;
    }
    const line = state.doc.line(lineNumber);
    let hasMarker = false;
    breakpoints?.between(line.from, line.from, () => {
      hasMarker = true;
    });

    if (!hasMarker) {
      output.push(breakpointEffect.of({ pos: line.from, on: true }));
    }

  });
  return output;
};
