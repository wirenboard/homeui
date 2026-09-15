import { JSONEditor } from '@wirenboard/json-editor';

// Array editor for a vertical tab list that fits the page area instead of running past the bottom
// of the window, asked for by the schema with "options": { "wb": { "fit_tabs": true } } next to its
// tabs format. Only the marker goes on here, the height comes from flexbox in styles.css.

const FIT_TABS_CLASS = 'je-fitTabs';

export function makeFitTabsArrayEditor() {
  return class extends JSONEditor.defaults.editors['array'] {
    build() {
      super.build();
      this.tabs_holder.classList.add(FIT_TABS_CLASS);
    }
  };
}
