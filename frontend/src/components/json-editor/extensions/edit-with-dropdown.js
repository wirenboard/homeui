import { JSONEditor } from '@wirenboard/json-editor';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Dropdown } from '@/components/dropdown';

// Editor for integer or string values.
// It allows free value editing and has additional dropdown list with possible values.
// Values in dropdown are defined by options.enum_values array.
// Titles for values could be set in options.enum_titles array.
export function makeEditWithDropdownEditor() {
  return class extends JSONEditor.AbstractEditor {
    preBuild() {
      this.enumSource = [];
      if (Array.isArray(this.schema.enumSource)) {
        this.enumSource = this.schema.enumSource.map((el) => {
          let res = {
            source: el.source,
          };
          if (el.value) {
            res.value = this.jsoneditor.compileTemplate(el.value, this.template_engine);
          }
          if (el.title) {
            res.title = this.jsoneditor.compileTemplate(el.title, this.template_engine);
          }
          if (el.filter && el.value) {
            res.filter = this.jsoneditor.compileTemplate(el.filter, this.template_engine);
          }
          return res;
        });
      }

      super.preBuild();
    }

    build() {
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
      this.dropdownOptions = this._buildStaticOptions();
      this.render();
    }

    _buildStaticOptions() {
      if (!this.schema.options) return [];
      const values = this.schema.options.enum_values || [];
      const titles = (this.schema.options.enum_titles || []).map((el) =>
        this.translateProperty(el),
      );
      return values.map((v, i) => ({
        label: titles[i] !== undefined ? titles[i] : `${v}`,
        value: v,
      }));
    }

    onWatchedFieldChange() {
      if (this.enumSource.length) {
        const vars = this.getWatchedFieldValues();
        const options = [];

        for (let i = 0; i < this.enumSource.length; i++) {
          let items = vars[this.enumSource[i].source] || [];

          if (this.enumSource[i].filter) {
            items = items.filter((item, j) =>
              this.enumSource[i].filter({ i: j, item, watched: vars }),
            );
          }

          for (let j = 0; j < items.length; j++) {
            const item = items[j];
            const value = this.enumSource[i].value
              ? this._typecast(this.enumSource[i].value({ i: j, item }))
              : items[j];
            const label = this.enumSource[i].title
              ? this.enumSource[i].title({ i: j, item })
              : `${value}`;
            options.push({ label, value });
          }
        }

        this.dropdownOptions = options;
        this.render();
      }
      super.onWatchedFieldChange();
    }

    render() {
      if (!this.reactRoot) {
        this.reactRoot = createRoot(this.control);
      }

      this.reactRoot.render(
        createElement(Dropdown, {
          options: this.dropdownOptions || [],
          value: this.value,
          isCreatable: true,
          isSearchable: true,
          isClearable: true,
          placeholder: this.options?.inputAttributes?.placeholder ? this.translateProperty(this.options?.inputAttributes?.placeholder) : '',
          isDisabled: this.disabled,
          onChange: (option) => {
            this.setValue(option?.value ?? '');
            this.onChange(true);
          },
        }),
      );
    }

    register() {
      super.register();
    }

    unregister() {
      super.unregister();
    }

    setValue(value) {
      if (typeof value !== 'undefined' && typeof value !== 'string') {
        value = `${value}`;
      }

      if (this.value === value) {
        return;
      }
      this.value = value;
      this.render();
    }

    getValue() {
      if (this.schema.type === 'integer') {
        const INTEGER_REGEXP = /^\s*(-|\+)?(\d+)\s*$/;
        if (this.value !== undefined && this.value !== null) {
          if (`${this.value}`.match(INTEGER_REGEXP) !== null) {
            const v = parseInt(this.value);
            if (!isNaN(v) && isFinite(v)) {
              return v;
            }
          }
        }
        if (this.value === '') {
          return undefined;
        }
      }
      return this.value;
    }

    getDefault() {
      if (this.schema.type === 'string') {
        return '';
      }
      return undefined;
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

    disable() {
      super.disable();
      this.disabled = true;
      this.render();
    }

    enable() {
      this.disabled = false;
      this.render();
      super.enable();
    }

    destroy() {
      if (this.reactRoot) {
        this.reactRoot.unmount();
      }
      super.destroy();
    }

    _typecast(value) {
      if (this.schema.enum && value === undefined) return undefined;
      else if (this.schema.type === 'boolean')
        return value === 'undefined' || value === undefined ? undefined : !!value;
      else if (this.schema.type === 'number') return 1 * value || 0;
      else if (this.schema.type === 'integer') return Math.floor(value * 1 || 0);
      return `${value}`;
    }
  };
}
