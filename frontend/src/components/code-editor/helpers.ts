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
        // @ts-expect-error
        const alreadyExists = set.between(e.value.pos, e.value.pos, () => true);
        // @ts-expect-error
        if (!alreadyExists && e.value.on) {
          updatedSet = set.update({ add: [breakpointMarker.range(e.value.pos)] });
        } else if (!e.value.on) {
          updatedSet = set.update({ filter: (from) => from !== e.value.pos });
        }
      }
    }
    return updatedSet;
  },
});

function toggleBreakpoint(view: EditorView, pos: number) {
  let breakpoints = view.state.field(breakpointState);
  let hasBreakpoint = false;
  breakpoints.between(pos, pos, () => {
    hasBreakpoint = true;
  });

  view.dispatch({
    effects: breakpointEffect.of({ pos, on: !hasBreakpoint }),
  });
}

export const customGutter = gutter({
  class: 'codeEditor-gutters',
  markers: (view) => view.state.field(breakpointState) || RangeSet.empty,
  domEventHandlers: {
    mousedown(view, line) {
      toggleBreakpoint(view, line.from);
      return true;
    },
  },
  initialSpacer: () => null,
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
