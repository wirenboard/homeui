'use strict';

import { JSONEditor } from "../../../3rdparty/jsoneditor";

function makeWbBootstrap3Theme () {
  return class extends JSONEditor.defaults.themes.bootstrap3 {
    getErrorMessage (text) {
      const el = document.createElement('p')
      el.style = el.style || {}
      el.style.color = '#b94a48'
      el.appendChild(document.createTextNode(text))
      return el
    }

    getTab (text, tabId) {
      const li = document.createElement('li')
      li.setAttribute('role', 'presentation')
      const a = document.createElement('a')
      a.setAttribute('href', `#${tabId}`)
      a.appendChild(text)
      a.setAttribute('aria-controls', tabId)
      a.setAttribute('role', 'tab')
      a.setAttribute('data-toggle', 'tab')
      text.style.marginLeft = '5px'
      li.appendChild(a)
      return li
    }

    setTabIcon(tab, icon) {
      tab.childNodes[0].insertBefore(icon, tab.childNodes[0].childNodes[0])
    }

    getFormButtonHolder () {
      const el = this.getButtonHolder()
      el.style.display = 'flex'
      return el
    }
  }
}

export default makeWbBootstrap3Theme