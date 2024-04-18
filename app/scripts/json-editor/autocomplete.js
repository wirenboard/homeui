'use strict';

import { JSONEditor } from '../../3rdparty/jsoneditor';

export default function makeAutocompleteEditor(options = []) {
  return class extends JSONEditor.defaults.editors.string {
    build() {
      super.build();

      if (options.length) {
        this.addDatalist(options)
      }
    }

    addDatalist(options) {
      this.datalist = document.createElement('datalist');
      this.datalist.id = 'options-datalist';

      options.forEach((optionValue) => {
        const option = document.createElement('option');
        option.value = optionValue;
        this.datalist.appendChild(option);
      });

      this.input.setAttribute('list', this.datalist.id);

      this.container.appendChild(this.datalist);
    }
  };
}
