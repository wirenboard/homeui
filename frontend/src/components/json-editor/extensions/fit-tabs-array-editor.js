import { JSONEditor } from '@wirenboard/json-editor';

// Editor for an array that asked for "options": { "wb": { "fit_tabs": true } } next to its tabs
// format. The class is only a hook, the layout itself is in styles.css.

const FIT_TABS_CLASS = 'je-fitTabs';

export function makeFitTabsArrayEditor() {
  return class extends JSONEditor.defaults.editors['array'] {
    build() {
      super.build();
      this.tabs_holder.classList.add(FIT_TABS_CLASS);
    }
  };
}
