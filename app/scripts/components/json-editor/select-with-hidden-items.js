'use strict';

import { JSONEditor } from "../../../3rdparty/jsoneditor";

function makeSelectWithHiddenItems () {
    return class extends JSONEditor.defaults.editors["select"] {

        setValue(value, initial) {
            /* Sanitize value before setting it */
            let sanitized = this.typecast(value)
        
            const haveToUseDefaultValue = !!this.jsoneditor.options.use_default_values || typeof this.schema.default !== 'undefined'
            if (!this.enum_values.includes(sanitized)) {
                if (this.value === sanitized) return
                // value is not in options list
                // select can't show correct item so force it to show empty editor
                this.input.value = null
            } else {
                if (initial && !this.isRequired() && !haveToUseDefaultValue) {
                    sanitized = this.enum_values[0]
                }
                if (this.value === sanitized) return

                if (initial) this.is_dirty = false
                else if (this.jsoneditor.options.show_errors === 'change') this.is_dirty = true
            
                this.input.value = this.enum_options[this.enum_values.indexOf(sanitized)]
            
            }
            this.value = sanitized

            this.onChange()
            this.change()
        }

        hideFromChoices () {
            var options = this.switcher_options = this.theme.getSwitcherOptions(this.input)
            options.forEach((op, i) => {
                if (this.schema.options &&
                    this.schema.options.enum_hidden &&
                    this.schema.options.enum_hidden.includes(this.enum_values[i])) {
                    op.hidden = 'hidden'
                }
            })
        }

        build () {
            super.build()
            this.hideFromChoices()
        }

        onWatchedFieldChange () {
            super.onWatchedFieldChange()
            this.hideFromChoices()
        }

        showValidationErrors (errors) {
            super.showValidationErrors(errors.filter(item => item.property !== 'oneOf'))
        }
    }
}

export default makeSelectWithHiddenItems
