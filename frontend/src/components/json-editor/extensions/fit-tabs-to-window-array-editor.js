import { JSONEditor } from '@wirenboard/json-editor';

// Editor for an array that asked for "options": { "wb": { "fit_tabs_to_window": true } } next to
// its tabs format. The class is only a hook, the layout itself is in styles.css.

const FIT_TABS_TO_WINDOW_CLASS = 'je-fitTabsToWindow';

export function makeFitTabsToWindowArrayEditor() {
  return class extends JSONEditor.defaults.editors['array'] {
    build() {
      super.build();
      this.tabs_holder.classList.add(FIT_TABS_TO_WINDOW_CLASS);
    }
  };
}
