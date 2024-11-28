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
      const datalistId = 'options-datalist';
      this.input.setAttribute('list', datalistId);

      // Since we have autocomplete only for devices it is enough to have only one datalist for multiple similar inputs
      if (!this.jsoneditor.element.querySelector(`#${datalistId}`)) {
        const datalist = document.createElement('datalist');
        datalist.id = datalistId;

        options.forEach((optionValue) => {
          const option = document.createElement('option');
          option.value = optionValue;
          datalist.appendChild(option);
        });

        this.jsoneditor.element.appendChild(datalist);
      }
    }
  };
}
