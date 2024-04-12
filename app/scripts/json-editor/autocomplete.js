'use strict';

import { JSONEditor } from '../../3rdparty/jsoneditor';

function makeAutocompleteEditor(options) {
  return class extends JSONEditor.AbstractEditor {
    build() {
      super.build();

      this.label = this.theme.getFormInputLabel(this.getTitle());
      this.input = this.theme.getFormInputField('text');
      this.description = this.theme.getFormInputDescription(this.translateProperty(this.schema.description));
      this.datalist = document.createElement('datalist');
      this.datalist.id = 'options-datalist';

      options.forEach((optionValue) => {
        const option = document.createElement('option');
        option.value = optionValue;
        this.datalist.appendChild(option);
      });

      this.input.setAttribute('list', this.datalist.id);

      this.container.append(this.label, this.input, this.description, this.datalist);
    }

    postBuild() {
      super.postBuild();
      this.input.addEventListener('change', this.onInputValueChange.bind(this));
    }

    onInputValueChange(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      this.setValue(ev.target.value);
    }

    setValue(value, initial) {
      this.input.value = value;
      super.setValue(value, initial);
      this.change();
    }

    destroy() {
      if (this.input) {
        this.input.removeEventListener('change', this.onInputValueChange.bind(this));
      }
      super.destroy();
    }
  };
}

export default makeAutocompleteEditor;
