'use strict';

import { JSONEditor } from '../../3rdparty/jsoneditor';

// The editor is derived from multiple editor.
// It is used with oneOf nodes and shows editor only for the first item in oneOf array
function makeFirstOneOfEditor() {
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

export default makeFirstOneOfEditor;
