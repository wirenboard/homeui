'use strict';

import { JSONEditor } from "../../../3rdparty/jsoneditor";

function makeChannelEditor () {
    JSONEditor.defaults.languages.en.in_queue_order = 'in queue order'
    JSONEditor.defaults.languages.en.fast_100 = 'fast (200ms)'
    JSONEditor.defaults.languages.en.fast_200 = 'fast (100ms)'
    JSONEditor.defaults.languages.en.fast_custom = 'fast, custom period'
    JSONEditor.defaults.languages.en.do_not_read = 'do not read'
  
    return class extends JSONEditor.AbstractEditor {
        constructor (options, defaults) {
            super(options, defaults)
            this.selectOptions = [
              {
                name: 'in_queue_order',
                showInput: false,
                enabled: true
              },
              {
                name: 'fast_200',
                value: 200,
                showInput: false,
                enabled: true
              },
              {
                name: 'fast_100',
                value: 100,
                showInput: false,
                enabled: true
              },
              {
                name: 'fast_custom',
                showInput: true,
                enabled: true
              },
              {
                name: 'do_not_read',
                showInput: false,
                enabled: false
              }
            ]
          }

          register () {
            super.register()
            if (this.input) {
              this.input.register()
            }
          }
        
          unregister () {
            super.unregister()
            if (this.input) {
              this.input.unregister()
            }
          }

          buildLabelCell() {
            const nameCell = this.theme.getTableCell()
            nameCell.style.verticalAlign = 'middle'
            this.label = this.theme.getFormInputLabel()
            nameCell.appendChild(this.label)
            this.container.appendChild(nameCell)
          }

          buildDropdown() {
            this.dropdown = this.theme.getSelectInput(this.selectOptions.map(o => this.translate(o.name)))
            this.dropdown.style.marginRight = '13px'
            this.dropdown.addEventListener('change', e => {
              e.preventDefault()
              e.stopPropagation()
              if (this.selectOptions[this.dropdown.selectedIndex].showInput) {
                this.input.input.style.display = ''
              } else {
                this.input.setValue('')
                this.input.input.style.display = 'none'
              }
            })
          }

          buildInput(container) {
            var schema = this.schema.properties.read_period_ms
            schema.options = schema.options || {}
            schema.options.compact = true
            const editorClass = this.jsoneditor.getEditorClass(schema)
            const { max_depth: maxDepth } = this.jsoneditor.options
            this.input = this.jsoneditor.createEditor(editorClass, {
              jsoneditor: this.jsoneditor,
              schema: !!maxDepth && this.currentDepth >= maxDepth ? this.getSchemaOnMaxDepth(schema) : schema,
              path: `${this.path}.read_period_ms`,
              parent: this
            }, this.currentDepth + 1)
            this.input.preBuild()
            this.input.setContainer(container)
            this.input.build()
            this.input.postBuild()
            this.input.setOptInCheckbox(editorClass.header)
            this.input.input.style.display = 'none'
          }

          build () {
            this.buildLabelCell()
            const holder = this.theme.getTableCell()
            const form = document.createElement('div')
            form.classList.add('form-inline')
            const group = document.createElement('div')
            group.classList.add('form-group')
            this.buildDropdown()
            group.appendChild(this.dropdown)
            this.buildInput(group)
            form.appendChild(group)
            holder.appendChild(form)
            this.container.appendChild(holder)
            this.no_link_holder = true
          }
  
          setValue (value) {
            this.value = angular.extend({}, value)
            if (value.title) {
              this.label.innerHTML = this.translateProperty(value.title)
            }
            var i
            if (!value.enabled) {
              i = this.selectOptions.findIndex(e => !e.enabled)
            } else {
              if (value.read_period_ms) {
                i = this.selectOptions.findIndex(e => e.enabled && (value.read_period_ms == e.value))
                if (i == -1) {
                  i = this.selectOptions.findIndex(e => e.enabled && e.showInput)
                }
              } else {
                i = this.selectOptions.findIndex(e => e.enabled && !e.showInput)
              }
            }
            this.dropdown.selectedIndex = i
            if (this.selectOptions[i].showInput) {
              this.input.input.style.display = ''
              this.input.setValue(value.read_period_ms)
            } else {
              this.input.input.style.display = 'none'
              this.input.setValue('')
            }
            this.onChange(true)
          }

          showValidationErrors (errors) {
            this.input.showValidationErrors(errors)
          }
  
          destroy () {
            if (this.input && this.input.parentNode) this.input.parentNode.removeChild(this.input)
            if (this.label && this.label.parentNode) this.label.parentNode.removeChild(this.label)
            if (this.dropdown && this.dropdown.parentNode) this.dropdown.parentNode.removeChild(this.dropdown)
            super.destroy()
          }
  
          getValue() {
            const item = this.selectOptions[this.dropdown.selectedIndex]
            this.value.enabled = item.enabled
            if (this.value.enabled) {
              if (item.value) {
                this.value.read_period_ms = item.value
                return this.value
              }
              if (item.showInput) {
                this.value.read_period_ms = this.input.getValue()
                return this.value
              }
            }
            delete this.value.read_period_ms
            return this.value
          }
      }
}

export default makeChannelEditor
