import { JSONEditor } from '@wirenboard/json-editor';

export function makeWbBootstrap3Theme() {
  return class extends JSONEditor.defaults.themes.bootstrap3 {
    getErrorMessage(text) {
      const el = document.createElement('p');
      el.style = el.style || {};
      el.style.color = '#b94a48';
      el.appendChild(document.createTextNode(text));
      return el;
    }

    getTab(text, tabId) {
      const li = document.createElement('li');
      li.setAttribute('role', 'presentation');
      const a = document.createElement('a');
      a.setAttribute('href', `#${tabId}`);
      a.appendChild(text);
      a.setAttribute('aria-controls', tabId);
      a.setAttribute('role', 'tab');
      a.setAttribute('data-toggle', 'tab');
      li.appendChild(a);
      return li;
    }

    setTabIcon(tab, icon) {
      tab.childNodes[0].insertBefore(icon, tab.childNodes[0].childNodes[0]);
    }

    setTabContextualColor(tab, color) {
      tab.classList.add('bg-' + color);
      tab.childNodes[0].classList.add('text-' + color);
    }

    markTabActive(row) {
      super.markTabActive(row);
      if (row.tab?.querySelector('a')) {
        row.tab.querySelector('a').setAttribute('aria-selected', 'true');
      }
    }

    markTabInactive(row) {
      super.markTabInactive(row);
      if (row.tab?.querySelector('a')) {
        row.tab.querySelector('a').setAttribute('aria-selected', 'false');
      }
    }

    removeTabContextualColors(tab) {
      this.removeContextualColorsInElement(tab);
      this.removeContextualColorsInElement(tab.childNodes[0]);
    }

    removeContextualColorsInElement(elem) {
      let toRemove = [];
      for (let i = 0; i < elem.classList.length; i++) {
        if (elem.classList[i].startsWith('bg-') || elem.classList[i].startsWith('text-')) {
          toRemove.push(elem.classList[i]);
        }
      }
      toRemove.forEach(removeClass => {
        elem.classList.remove(removeClass);
      });
    }

    getFormButtonHolder() {
      const el = this.getButtonHolder();
      el.style.display = 'flex';
      return el;
    }
  };
}
