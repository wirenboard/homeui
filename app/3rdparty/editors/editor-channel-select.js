'use strict';

JSONEditor.defaults.editors.channelSelect = JSONEditor.AbstractEditor.extend({
    /*jshint camelcase: false */

    register: function () {
        this._super();
        if (!this.input) {
            return;
        }
        this.input.setAttribute('name', this.formname);
    },
    unregister: function () {
        this._super();
        if (!this.input) {
            return;
        }
        this.input.removeAttribute('name');
    },
    setValue: function (value, initial, from_template) {
        var self = this;

        if (this.template && !from_template) {
            return;
        }

        if (value === null || typeof value === 'undefined') {
            value = '';
        }
        else if (typeof value === 'object') {
            value = JSON.stringify(value);
        }
        else if (typeof value !== 'string') {
            value = '' + value;
        }

        if (value === this.serialized) {
            return;
        }

        var sanitized = this.sanitize(value);

        if (this.input.value === sanitized) {
            return;
        }

        this.input.value = sanitized;

        var changed = from_template || this.getValue() !== value;

        this.refreshValue();

        if (initial) {
            this.is_dirty = false;
        }
        else if (this.jsoneditor.options.show_errors === 'change') {
            this.is_dirty = true;
        }

        if (this.adjust_height) {
            this.adjust_height(this.input);
        }

        this.onChange(changed);
    },
    build: function () {
        var self = this, i;
        if (!this.options.compact) {
            this.header = this.label = this.theme.getFormInputLabel(this.getTitle());
        }
        if (this.schema.description) {
            this.description = this.theme.getFormInputDescription(this.schema.description);
        }

        this.format = this.schema.format;

        this.input_type = 'hidden';
        this.input = this.theme.getFormInputField(this.input_type);


        if (this.options.compact) {
            this.container.className += ' compact';
        }
        else {
            if (this.options.input_width) {
                this.input.style.width = this.options.input_width;
            }
        }

        if (this.schema.readOnly || this.schema.readonly || this.schema.template) {
            this.always_disabled = true;
            this.input.disabled = true;
        }

        this.input.addEventListener('change', function (e) {
            e.preventDefault();
            e.stopPropagation();

            if (self.schema.template) {
                this.value = self.value;
                return;
            }

            var val = this.value;

            var sanitized = self.sanitize(val);
            if (val !== sanitized) {
                this.value = sanitized;
            }

            self.is_dirty = true;

            self.refreshValue();
            self.onChange(true);
        });

        if (this.format) {
            this.input.setAttribute('data-schemaformat', this.format);
        }

        this.control = this.theme.getFormControl(this.label, this.input, '');

        // TEMPORARY SUPPORT
        if (this.schema.title === 'MQTT topic pattern') {
            this.schema.options = {
                pattern: true
            };
        }

        var directive = document.createElement('channel-select');
        directive.className = 'render';
        directive.setAttribute('map', this.formname);
        if (this.schema.options.pattern) {
            directive.setAttribute('use-pattern', 'true');
        }
        if (this.schema.description) {
            directive.setAttribute('tip', this.schema.description);
        }

        this.control.appendChild(directive);

        this.container.appendChild(this.control);

        this.refreshValue();
    },
    enable: function () {
        if (!this.always_disabled) {
            this.input.disabled = false;
            // TODO: WYSIWYG and Markdown editors
        }
        this._super();
    },
    disable: function () {
        this.input.disabled = true;
        // TODO: WYSIWYG and Markdown editors
        this._super();
    },
    afterInputReady: function () {
        var self = this, options;
        self.theme.afterInputReady(self.input);
    },
    refreshValue: function () {
        this.value = this.input.value;
        if (typeof this.value !== 'string') {
            this.value = '';
        }
        this.serialized = this.value;
    },
    destroy: function () {

        this.template = null;
        if (this.input && this.input.parentNode) {
            this.input.parentNode.removeChild(this.input);
        }
        if (this.label && this.label.parentNode) {
            this.label.parentNode.removeChild(this.label);
        }
        if (this.description && this.description.parentNode) {
            this.description.parentNode.removeChild(this.description);
        }

        this._super();
    },
    
    sanitize: function (value) {
        return value;
    },
    
    onWatchedFieldChange: function () {
        var self = this, vars, j;

        // If this editor needs to be rendered by a macro template
        if (this.template) {
            vars = this.getWatchedFieldValues();
            this.setValue(this.template(vars), false, true);
        }

        this._super();
    }
});
