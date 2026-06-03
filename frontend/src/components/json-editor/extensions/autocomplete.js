import { JSONEditor } from '@wirenboard/json-editor';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Dropdown } from '@/components/dropdown';

export function makeAutocompleteEditor(topics) {
  return class extends JSONEditor.AbstractEditor {
    build() {
      // AbstractEditor doesn't render label/description by default, so reproduce
      // the pattern used by the built-in string editor — otherwise schema title
      // and description are silently dropped for every wb-autocomplete field.
      if (!this.options.compact) {
        this.label = this.theme.getFormInputLabel(this.getTitle(), this.isRequired());
      }

      this.control = document.createElement('div');
      this.control.style.minWidth = '180px';

      const formControl = this.theme.getFormControl(this.label, this.control);
      this.container.appendChild(formControl);

      if (this.schema.description) {
        this.container.appendChild(
          this.theme.getFormInputDescription(this.translateProperty(this.schema.description)),
        );
      }

      this.control.controlgroup = formControl;

      this.render();
    }

    showValidationErrors(errors) {
      const messages = errors
        .filter((error) => error.path === this.path)
        .map((error) => error.message);

      if (messages.length) {
        this.theme.addInputError(this.control, `${messages.join('. ')}.`);
      } else {
        this.theme.removeInputError(this.control);
      }
    }

    render() {
      if (!this.reactRoot) {
        this.reactRoot = createRoot(this.control);
      }

      this.reactRoot.render(
        createElement(Dropdown, {
          options: topics || [],
          value: this.value,
          isSearchable: true,
          isClearable: true,
          onChange: (option) => {
            this.setValue(option?.value || '');
            this.onChange(true);
          },
        }),
      );
    }

    setValue(value) {
      if (this.value === value) {
        return;
      }
      this.value = value;
      this.render();
    }

    getValue() {
      return this.value;
    }

    refresh() {
      this.render();
    }

    destroy() {
      if (this.reactRoot) {
        this.reactRoot.unmount();
      }
      super.destroy();
    }
  };
}
