'use strict';

import { JSONEditor } from "../../../3rdparty/jsoneditor";

// Editor for integer or string values.
// It allows free value editing and has additional dropdown list with possible values.
// Values in dropdown are defined by options.enum_values array.
// Titles for values could be set in options.enum_titles array.
function makeEditWithDropdownEditor () {
    return class extends JSONEditor.AbstractEditor {
        constructor (options, defaults) {
          super(options, defaults)
        }

        register () {
          super.register()
          if (!this.input) return
          this.input.setAttribute('name', this.formname)
        }
      
        unregister () {
          super.unregister()
          if (!this.input) return
          this.input.removeAttribute('name')
        }

        onWatchedFieldChange () {
          if (this.enumSource) {
            var vars = this.getWatchedFieldValues()
      
            for (let i = 0; i < this.enumSource.length; i++) {
              var items = vars[this.enumSource[i].source]
              if (items) {
                this.theme.setSelectOptions(this.dropdown, items, items)
              }
            }
            this.dropdown.value = undefined
          }
          super.onWatchedFieldChange()
        }

        preBuild () {
          this.enumSource = []
          if (Array.isArray(this.schema.enumSource)) {
            for (let i = 0; i < this.schema.enumSource.length; i++) {
              this.enumSource[i] = {
                source: this.schema.enumSource[i].source
              }
            }
          }
          super.preBuild()
        }

        build () {
          if (!this.options.compact) {
            this.label = this.theme.getFormInputLabel(this.getTitle())
          }
          this.input = this.theme.getFormInputField("text")
          this.dropdown = this.theme.getSelectInput()

          this.setInputAttributes()
          this.input.addEventListener('change', e => {
            e.preventDefault()
            e.stopPropagation()
            this.refreshValue()
            this.onChange(true)
          })
          this.input.onfocus = () => {
            this.dropdown.classList.add('editable-dropdown-focused')
          }
          this.input.onblur = () => {
            if (document.activeElement !== this.dropdown) {
              this.dropdown.classList.remove('editable-dropdown-focused')
            }
          }
          
          if (this.schema.options) {
            const titles = (this.schema.options.enum_titles || []).map(el => this.translateProperty(el))
            this.theme.setSelectOptions(this.dropdown, this.schema.options.enum_values || [], titles)
          }
          this.dropdown.addEventListener('change', e => {
            e.preventDefault()
            e.stopPropagation()
            this.setValue(this.dropdown.value)
            this.input.focus()
          })
          this.dropdown.onfocus = () => {
            this.input.classList.add('editable-dropdown-focused')
          }
          this.dropdown.onblur = () => {
            if (document.activeElement !== this.input) {
              this.input.classList.remove('editable-dropdown-focused')
            }
          }
          this.dropdown.value = undefined

          this.control = this.theme.getFormControl(this.label, this.input)
          this.control.appendChild(this.dropdown)
          this.control.classList.add('editable-dropdown')
          this.container.appendChild(this.control)
          if (this.options.compact) {
            this.container.classList.add('compact')
          }

          /* Any special formatting that needs to happen after the input is added to the dom */
          window.requestAnimationFrame(() => {
            this.theme.afterInputReady(this.input)
          })
        }

        setValue (value) {
          if (typeof value !== 'undefined' && typeof value !== 'string') {
            value = `${value}`
          }
      
          if (this.value === value) {
            return
          }

          this.input.value = value;
          this.refreshValue()
          this.onChange(true)
        }

        getValue () {
          if (typeof this.input === 'undefined') {
            return undefined
          }

          if (this.schema.type === 'integer') {
            // taken from isInteger function from json-editor's utilities.js
            const INTEGER_REGEXP = /^\s*(-|\+)?(\d+)\s*$/
            if (typeof this.input.value !== 'undefined' && this.input.value !== null) {
              if(this.input.value.match(INTEGER_REGEXP) !== null) {
                const v = parseInt(this.input.value)
                if (!isNaN(v) && isFinite(v)) {
                  return v
                }
              }
            }
            if (this.input.value === '') {
              return undefined
            }
          }
          return this.input.value
        }

        refreshValue () {
          this.value = this.input.value
          this.dropdown.value = undefined
        }

        showValidationErrors (errors) {
          const addMessage = (messages, error) => {
            if (error.path === this.path) {
              messages.push(error.message)
            }
            return messages
          }
          const messages = errors.reduce(addMessage, [])
      
          if (messages.length) {
            this.theme.addInputError(this.input, `${messages.join('. ')}.`)
          } else {
            this.theme.removeInputError(this.input)
          }
        }

        destroy () {
          if (this.input && this.input.parentNode) this.input.parentNode.removeChild(this.input)
          if (this.label && this.label.parentNode) this.label.parentNode.removeChild(this.label)
          if (this.dropdown && this.dropdown.parentNode) this.dropdown.parentNode.removeChild(this.dropdown)
          super.destroy()
        }

        getDefault () {
          if (this.schema.type === 'string') {
            return ''
          }
          return undefined
        }
    }
}

export default makeEditWithDropdownEditor
