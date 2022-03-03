'use strict';

import { JSONEditor } from "../../../3rdparty/jsoneditor";

function makeChannelsTableEditor () {
  JSONEditor.defaults.languages.en.parameter = 'Parameter'
  JSONEditor.defaults.languages.en.poll = 'Poll'
  return class extends JSONEditor.defaults.editors["table"] {
        build() {
          super.build()
          this.header_row.appendChild(this.theme.getTableHeaderCell(this.translate('parameter')))
          this.header_row.appendChild(this.theme.getTableHeaderCell(this.translate('poll')))
        }
    }
}

export default makeChannelsTableEditor
