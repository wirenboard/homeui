import { JSONEditor } from '@wirenboard/json-editor';

// The editor is derived from multiple editor.
// It is used with oneOf nodes and shows editor only for the first item in oneOf array
export function makeFirstOneOfEditor() {
  return class extends JSONEditor.defaults.editors['multiple'] {
    build() {
      super.build();
      this.switcher.style.display = 'none';
      this.header.style.display = 'none';
      if (this.editors[this.type].header) {
        this.editors[this.type].header.style.display = '';
      }
    }
  };
}
