'use strict';

import { JSONEditor } from "../../../3rdparty/jsoneditor";

function makeSelectWithHiddenItems () {
    return class extends JSONEditor.defaults.editors["select"] {

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
    }
}

export default makeSelectWithHiddenItems
